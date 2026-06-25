import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { productPublicSelect } from '@/features/products/product-data';
import { parseProductInput } from '@/features/products/product-schema';

function unauthorized() {
  return NextResponse.json({ error: 'Acesso nao autorizado.' }, { status: 401 });
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const active = url.searchParams.get('active');

  if (active !== 'true' && !isAdminRequest(request)) {
    return unauthorized();
  }

  const products = await getPrisma().product.findMany({
    orderBy: { createdAt: 'desc' },
    select: productPublicSelect,
    where: active === 'true' ? { isActive: true } : undefined,
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return unauthorized();
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
    const product = await getPrisma().product.create({
      data: parsed.data,
      select: productPublicSelect,
    });

    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Nao foi possivel criar o produto. Verifique se o slug ja existe.' },
      { status: 409 }
    );
  }
}
