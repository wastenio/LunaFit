import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customer-auth';
import { getPrisma } from '@/lib/prisma';
import { readAnalyticsIdentity } from '@/features/analytics/analytics-server';
import { getOrderNotification } from '@/features/orders/order-notification';
import { parseCheckoutInput } from '@/features/orders/order-schema';
import { getCurrentPriceInCents } from '@/features/products/product-promotion';

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

  const prisma = getPrisma();

  try {
    const order = await prisma.$transaction(async (transaction) => {
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
          subtotalInCents,
          shippingInCents: 0,
          totalInCents: subtotalInCents,
          items: {
            create: items,
          },
        },
        select: { id: true, number: true },
      });
      const notification = getOrderNotification('PENDING', createdOrder.number);

      await transaction.orderStatusEvent.create({
        data: {
          orderId: createdOrder.id,
          status: 'PENDING',
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
            type: 'PURCHASE',
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
      await transaction.cartItem.deleteMany({
        where: { userId: session.user.id },
      });

      return { number: createdOrder.number };
    });

    return NextResponse.json(order, { status: 201 });
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
