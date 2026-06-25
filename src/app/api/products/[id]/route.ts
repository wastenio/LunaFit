import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { productPublicSelect } from '@/features/products/product-data';
import { parseProductInput } from '@/features/products/product-schema';

function unauthorized() {
  return NextResponse.json({ error: 'Acesso nao autorizado.' }, { status: 401 });
}

function parseId(value: string) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function validationError(errors: Record<string, string>) {
  return NextResponse.json(
    {
      error: Object.values(errors)[0] || 'Dados invalidos.',
      errors,
    },
    { status: 400 }
  );
}

type ProductRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: ProductRouteContext) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: 'ID invalido.' }, { status: 400 });
  }

  const product = await getPrisma().product.findUnique({
    select: productPublicSelect,
    where: { id },
  });

  if (!product) {
    return NextResponse.json({ error: 'Produto nao encontrado.' }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(request: Request, { params }: ProductRouteContext) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: 'ID invalido.' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ error: 'JSON invalido.' }, { status: 400 });
  }

  const parsed = parseProductInput(body);

  if (!parsed.success) {
    return validationError(parsed.errors);
  }

  try {
    const product = await getPrisma().product.update({
      data: parsed.data,
      select: productPublicSelect,
      where: { id },
    });

    return NextResponse.json(product);
  } catch {
    return NextResponse.json(
      { error: 'Nao foi possivel atualizar o produto. Verifique se ele existe e se o slug nao esta em uso.' },
      { status: 409 }
    );
  }
}

export async function DELETE(request: Request, { params }: ProductRouteContext) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: 'ID invalido.' }, { status: 400 });
  }

  try {
    await getPrisma().product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Produto nao encontrado.' }, { status: 404 });
  }
}
