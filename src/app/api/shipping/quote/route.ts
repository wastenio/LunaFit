import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customer-auth';
import {
  getShippingQuotesForCart,
} from '@/features/shipping/shipping-quotes';
import { ShippingQuoteError } from '@/features/shipping/melhor-envio';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  const session = await getCustomerSession();

  if (!session) {
    return NextResponse.json({ error: 'Faca login para calcular o frete.' }, { status: 401 });
  }

  const body = asRecord(await request.json().catch(() => null));
  const postalCode = asString(body?.postalCode);

  if (!postalCode) {
    return NextResponse.json({ error: 'Informe o CEP de entrega.' }, { status: 400 });
  }

  try {
    const options = await getShippingQuotesForCart(session.user.id, postalCode);

    return NextResponse.json({ options });
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[shipping] quote failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });

    return NextResponse.json(
      { error: 'Nao foi possivel calcular o frete agora.' },
      { status: 500 }
    );
  }
}
