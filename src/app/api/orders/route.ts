import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customer-auth';
import { isMercadoPagoConfigured } from '@/lib/mercado-pago';
import { getPrisma } from '@/lib/prisma';
import { readAnalyticsIdentity } from '@/features/analytics/analytics-server';
import { parseCheckoutInput } from '@/features/orders/order-schema';
import { getPaymentNotification } from '@/features/payments/payment-notification';
import { getCurrentPriceInCents } from '@/features/products/product-promotion';
import { ShippingQuoteError } from '@/features/shipping/melhor-envio';
import {
  findShippingQuoteOption,
  getShippingQuotesForCart,
} from '@/features/shipping/shipping-quotes';
import type { ShippingQuoteOption } from '@/features/shipping/shipping-types';

function createOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `LF-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
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
  const { shippingServiceId, ...checkoutData } = parsed.data;
  let selectedShipping: ShippingQuoteOption | null = null;

  try {
    const shippingOptions = await getShippingQuotesForCart(
      session.user.id,
      checkoutData.postalCode
    );
    selectedShipping = findShippingQuoteOption(shippingOptions, shippingServiceId);

    if (!selectedShipping) {
      return NextResponse.json(
        { error: 'Selecione uma opcao de frete valida para este CEP.' },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[shipping] order quote failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });

    return NextResponse.json(
      { error: 'Nao foi possivel confirmar o frete agora.' },
      { status: 500 }
    );
  }

  if (!selectedShipping) {
    return NextResponse.json(
      { error: 'Selecione uma opcao de frete valida para este CEP.' },
      { status: 400 }
    );
  }

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
          ...checkoutData,
          number: createOrderNumber(),
          status: 'PENDING',
          userId: session.user.id,
          customerEmail: user.email,
          paymentProvider: 'MERCADO_PAGO',
          paymentStatus: 'PENDING',
          subtotalInCents,
          shippingCarrierName: selectedShipping.carrierName,
          shippingDeliveryMaxDays: selectedShipping.deliveryMaxDays,
          shippingDeliveryMinDays: selectedShipping.deliveryMinDays,
          shippingInCents: selectedShipping.priceInCents,
          shippingProvider: selectedShipping.provider,
          shippingServiceId: selectedShipping.serviceId,
          shippingServiceName: selectedShipping.serviceName,
          shippingStatus: 'quoted',
          shippingUpdatedAt: new Date(),
          totalInCents: subtotalInCents + selectedShipping.priceInCents,
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
            valueInCents: createdOrder.totalInCents,
          },
        });
      }

      await transaction.user.update({
        data: { phone: checkoutData.phone },
        where: { id: session.user.id },
      });
      await transaction.cartItem.deleteMany({
        where: { userId: session.user.id },
      });

      return createdOrder;
    });

    return NextResponse.json(
      {
        number: createdOrder.number,
        checkoutUrl: `/pagamento/${encodeURIComponent(createdOrder.number)}`,
      },
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
