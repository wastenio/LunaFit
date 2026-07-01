import { NextResponse } from 'next/server';
import {
  getMercadoPagoPaymentClient,
  isInvalidMercadoPagoWebhookSignature,
  validateMercadoPagoWebhook,
} from '@/lib/mercado-pago';
import { applyMercadoPagoPaymentUpdate } from '@/features/payments/payment-updates';

export const runtime = 'nodejs';

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getBodyDataId(body: Record<string, unknown> | null) {
  const data = asObject(body?.data);

  return typeof data?.id === 'string' || typeof data?.id === 'number'
    ? String(data.id)
    : '';
}

function getNotificationType(body: Record<string, unknown> | null, requestUrl: string) {
  const url = new URL(requestUrl);
  const type = body?.type;
  const topic = body?.topic;

  return (
    url.searchParams.get('type') ||
    url.searchParams.get('topic') ||
    (typeof type === 'string' ? type : '') ||
    (typeof topic === 'string' ? topic : '')
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const body = asObject(
    rawBody
      ? (() => {
          try {
            return JSON.parse(rawBody) as unknown;
          } catch {
            return null;
          }
        })()
      : null
  );
  const url = new URL(request.url);
  const dataId =
    url.searchParams.get('data.id') ||
    url.searchParams.get('data_id') ||
    getBodyDataId(body);

  if (!dataId) {
    console.warn('[mercado-pago] webhook ignored without data id');
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    validateMercadoPagoWebhook({ dataId, request });
  } catch (error) {
    if (isInvalidMercadoPagoWebhookSignature(error)) {
      console.warn('[mercado-pago] invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.error('[mercado-pago] webhook validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const notificationType = getNotificationType(body, request.url);

  if (notificationType && notificationType !== 'payment') {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const payment = await getMercadoPagoPaymentClient().get({ id: dataId });
    const result = await applyMercadoPagoPaymentUpdate(payment);

    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error('[mercado-pago] webhook processing failed', {
      dataId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Could not process payment' }, { status: 500 });
  }
}
