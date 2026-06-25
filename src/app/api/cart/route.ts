import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customer-auth';
import { getPrisma } from '@/lib/prisma';
import {
  readAnalyticsIdentity,
  recordAnalyticsEvent,
} from '@/features/analytics/analytics-server';
import { getCartForUser } from '@/features/cart/cart-data';
import {
  parsePositiveInteger,
  validateCartSelection,
} from '@/features/cart/cart-schema';

function unauthorized() {
  return NextResponse.json({ error: 'Faca login para acessar o carrinho.' }, { status: 401 });
}

export async function GET() {
  const session = await getCustomerSession();

  if (!session) {
    return unauthorized();
  }

  return NextResponse.json(await getCartForUser(session.user.id));
}

export async function POST(request: Request) {
  const session = await getCustomerSession();

  if (!session) {
    return unauthorized();
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const analyticsIdentity = readAnalyticsIdentity(request);
  const productId = parsePositiveInteger(body?.productId);
  const quantity = parsePositiveInteger(body?.quantity);
  const size = typeof body?.size === 'string' ? body.size.trim() : '';
  const color = typeof body?.color === 'string' ? body.color.trim() : '';

  if (!body || !productId || !quantity) {
    return NextResponse.json({ error: 'Dados do produto invalidos.' }, { status: 400 });
  }

  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    select: {
      id: true,
      slug: true,
      sizes: true,
      colors: true,
      stock: true,
      isActive: true,
    },
    where: { id: productId },
  });

  if (!product) {
    return NextResponse.json({ error: 'Produto nao encontrado.' }, { status: 404 });
  }

  const selectionError = validateCartSelection(product, size, color, quantity);

  if (selectionError) {
    return NextResponse.json({ error: selectionError }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.cartItem.findUnique({
        where: {
          userId_productId_size_color: {
            userId: session.user.id,
            productId,
            size,
            color,
          },
        },
      });
      const nextQuantity = (existing?.quantity ?? 0) + quantity;

      if (nextQuantity > product.stock) {
        throw new Error('STOCK');
      }

      if (existing) {
        await transaction.cartItem.update({
          data: { quantity: nextQuantity },
          where: { id: existing.id },
        });
        return;
      }

      await transaction.cartItem.create({
        data: {
          userId: session.user.id,
          productId,
          size,
          color,
          quantity,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'STOCK') {
      return NextResponse.json(
        { error: 'A quantidade total no carrinho excede o estoque.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Nao foi possivel atualizar o carrinho.' }, { status: 500 });
  }

  if (analyticsIdentity) {
    await recordAnalyticsEvent({
      ...analyticsIdentity,
      type: 'ADD_TO_CART',
      userId: session.user.id,
      path: `/produtos/${product.slug}`,
      productId,
    }).catch(() => null);
  }

  return NextResponse.json(await getCartForUser(session.user.id), { status: 201 });
}
