import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customer-auth';
import { getPrisma } from '@/lib/prisma';
import { getCartForUser } from '@/features/cart/cart-data';
import { parsePositiveInteger } from '@/features/cart/cart-schema';

function parseId(value: string) {
  return parsePositiveInteger(value);
}

type CartItemRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: CartItemRouteContext
) {
  const { id: rawId } = await params;
  const session = await getCustomerSession();

  if (!session) {
    return NextResponse.json({ error: 'Faca login para acessar o carrinho.' }, { status: 401 });
  }

  const id = parseId(rawId);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const quantity = parsePositiveInteger(body?.quantity);

  if (!id || !quantity) {
    return NextResponse.json({ error: 'Quantidade invalida.' }, { status: 400 });
  }

  const item = await getPrisma().cartItem.findFirst({
    include: { product: { select: { stock: true, isActive: true } } },
    where: { id, userId: session.user.id },
  });

  if (!item) {
    return NextResponse.json({ error: 'Item nao encontrado.' }, { status: 404 });
  }

  if (!item.product.isActive || quantity > item.product.stock) {
    return NextResponse.json(
      { error: 'Quantidade indisponivel para este produto.' },
      { status: 409 }
    );
  }

  await getPrisma().cartItem.update({
    data: { quantity },
    where: { id },
  });

  return NextResponse.json(await getCartForUser(session.user.id));
}

export async function DELETE(
  _request: Request,
  { params }: CartItemRouteContext
) {
  const { id: rawId } = await params;
  const session = await getCustomerSession();

  if (!session) {
    return NextResponse.json({ error: 'Faca login para acessar o carrinho.' }, { status: 401 });
  }

  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: 'Item invalido.' }, { status: 400 });
  }

  const result = await getPrisma().cartItem.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Item nao encontrado.' }, { status: 404 });
  }

  return NextResponse.json(await getCartForUser(session.user.id));
}
