import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customer-auth';
import {
  createMercadoPagoCheckoutPreference,
  getMercadoPagoCheckoutUrl,
  isMercadoPagoConfigured,
} from '@/lib/mercado-pago';
import { getPrisma } from '@/lib/prisma';
import { readAnalyticsIdentity } from '@/features/analytics/analytics-server';
import { parseCheckoutInput } from '@/features/orders/order-schema';
import { getPaymentNotification } from '@/features/payments/payment-notification';
import { getCurrentPriceInCents } from '@/features/products/product-promotion';

function createOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `LF-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function releaseOrderReservation(number: string) {
  const prisma = getPrisma();

  await prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      include: { items: true },
      where: { number },
    });

    if (!order) {
      return;
    }

    for (const item of order.items) {
      if (item.productId) {
        await transaction.product.updateMany({
          data: { stock: { increment: item.quantity } },
          where: { id: item.productId },
        });
      }
    }

    await transaction.order.delete({ where: { id: order.id } });
  });
}

export async function POST(request: Request) {
  const session = await getCustomerSession();

  if (!session) {
    return NextResponse.json({ error: 'Faca login para finalizar o pedido.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const analyticsIdentity = readAnalyticsIdentity(request);

  if (!body) {
    return NextResponse.json({ error: 'Dados do pedido invalidos.' }, { status: 400 });
  }

  const parsed = parseCheckoutInput(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { error: 'O pagamento online ainda nao esta configurado.' },
      { status: 503 }
    );
  }

  const prisma = getPrisma();

  try {
    const createdOrder = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        select: { email: true },
        where: { id: session.user.id },
      });
      const cartItems = await transaction.cartItem.findMany({
        include: { product: true },
        where: { userId: session.user.id },
      });

      if (!user?.email) {
        throw new Error('EMAIL');
      }

      if (cartItems.length === 0) {
        throw new Error('EMPTY');
      }

      const items = cartItems.map((item) => {
        if (!item.product.isActive || item.product.stock < item.quantity) {
          throw new Error(`STOCK:${item.product.name}`);
        }

        const unitPriceInCents = getCurrentPriceInCents(item.product);

        return {
          productId: item.product.id,
          productName: item.product.name,
          productSlug: item.product.slug,
          imageUrl: item.product.imageUrl,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unitPriceInCents,
          totalInCents: unitPriceInCents * item.quantity,
        };
      });
      const subtotalInCents = items.reduce((total, item) => total + item.totalInCents, 0);

      for (const item of items) {
        const updated = await transaction.product.updateMany({
          data: { stock: { decrement: item.quantity } },
          where: {
            id: item.productId,
            isActive: true,
            stock: { gte: item.quantity },
          },
        });

        if (updated.count !== 1) {
          throw new Error(`STOCK:${item.productName}`);
        }
      }

      const createdOrder = await transaction.order.create({
        data: {
          ...parsed.data,
          number: createOrderNumber(),
          status: 'PENDING',
          userId: session.user.id,
          customerEmail: user.email,
          paymentProvider: 'MERCADO_PAGO',
          paymentStatus: 'PENDING',
          subtotalInCents,
          shippingInCents: 0,
          totalInCents: subtotalInCents,
          items: {
            create: items,
          },
        },
        include: {
          items: true,
        },
      });
      const notification = getPaymentNotification('PENDING', createdOrder.number);

      await transaction.orderStatusEvent.create({
        data: {
          orderId: createdOrder.id,
          status: 'PAYMENT_PENDING',
          ...notification,
        },
      });
      await transaction.customerNotification.create({
        data: {
          orderId: createdOrder.id,
          userId: session.user.id,
          ...notification,
        },
      });
      if (analyticsIdentity) {
        await transaction.analyticsEvent.create({
          data: {
            type: 'CHECKOUT_STARTED',
            visitorId: analyticsIdentity.visitorId,
            sessionId: analyticsIdentity.sessionId,
            userId: session.user.id,
            path: '/checkout',
            orderId: createdOrder.id,
            valueInCents: subtotalInCents,
          },
        });
      }

      await transaction.user.update({
        data: { phone: parsed.data.phone },
        where: { id: session.user.id },
      });

      return createdOrder;
    });

    let checkoutUrl = '';

    try {
      const preference = await createMercadoPagoCheckoutPreference({
        order: createdOrder,
        items: createdOrder.items,
        requestUrl: request.url,
      });
      checkoutUrl = getMercadoPagoCheckoutUrl(preference) || '';

      if (!preference.id || !checkoutUrl) {
        throw new Error('PREFERENCE_WITHOUT_CHECKOUT_URL');
      }

      await prisma.$transaction([
        prisma.order.update({
          data: {
            paymentInitPoint: checkoutUrl,
            paymentPreferenceId: preference.id,
          },
          where: { id: createdOrder.id },
        }),
        prisma.cartItem.deleteMany({
          where: { userId: session.user.id },
        }),
      ]);
    } catch (error) {
      await releaseOrderReservation(createdOrder.number);
      console.error('[mercado-pago] checkout preference failed', {
        orderNumber: createdOrder.number,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return NextResponse.json(
        { error: 'Nao foi possivel iniciar o pagamento agora. Tente novamente.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { number: createdOrder.number, checkoutUrl },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'EMPTY') {
        return NextResponse.json({ error: 'Seu carrinho esta vazio.' }, { status: 400 });
      }

      if (error.message === 'EMAIL') {
        return NextResponse.json(
          { error: 'Sua conta Google precisa fornecer um email valido.' },
          { status: 400 }
        );
      }

      if (error.message.startsWith('STOCK:')) {
        return NextResponse.json(
          { error: `Estoque insuficiente para ${error.message.slice(6)}.` },
          { status: 409 }
        );
      }
    }

    return NextResponse.json({ error: 'Nao foi possivel finalizar o pedido.' }, { status: 500 });
  }
}
