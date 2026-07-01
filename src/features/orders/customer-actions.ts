'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer-auth';
import {
  createMercadoPagoCheckoutPreference,
  getMercadoPagoCheckoutUrl,
  isMercadoPagoConfigured,
} from '@/lib/mercado-pago';
import { getPrisma } from '@/lib/prisma';

type PaymentLinkResult =
  | 'failed'
  | 'not-configured'
  | 'test-buyer-required'
  | 'test-buyer-invalid'
  | 'test-buyer-equals-customer'
  | 'closed';

function getOrderPaymentPath(number: string, result: PaymentLinkResult) {
  return `/pedidos/${encodeURIComponent(number)}?paymentLink=${result}`;
}

async function getActionRequestUrl() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get('origin');

  if (origin) {
    return origin;
  }

  const host = requestHeaders.get('host');

  if (host) {
    const protocol = requestHeaders.get('x-forwarded-proto') || 'http';
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://127.0.0.1:3210';
}

export async function regenerateOrderPaymentLinkAction(number: string) {
  const session = await getCustomerSession();

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/pedidos/${number}`)}`);
  }

  if (!isMercadoPagoConfigured()) {
    redirect(getOrderPaymentPath(number, 'not-configured'));
  }

  const prisma = getPrisma();
  const order = await prisma.order.findFirst({
    include: {
      items: {
        orderBy: { id: 'asc' },
      },
    },
    where: {
      number,
      userId: session.user.id,
    },
  });

  if (!order) {
    redirect('/minha-conta');
  }

  if (
    order.status === 'CANCELLED' ||
    order.status === 'COMPLETED' ||
    order.paymentStatus === 'APPROVED' ||
    order.paymentStatus === 'REFUNDED' ||
    order.paymentStatus === 'CHARGED_BACK'
  ) {
    redirect(getOrderPaymentPath(order.number, 'closed'));
  }

  let checkoutUrl = '';

  try {
    const preference = await createMercadoPagoCheckoutPreference({
      order,
      items: order.items,
      requestUrl: await getActionRequestUrl(),
    });
    checkoutUrl = getMercadoPagoCheckoutUrl(preference) || '';

    if (!preference.id || !checkoutUrl) {
      throw new Error('PREFERENCE_WITHOUT_CHECKOUT_URL');
    }

    await prisma.order.update({
      data: {
        paymentInitPoint: checkoutUrl,
        paymentPreferenceId: preference.id,
        paymentStatus: 'PENDING',
        paymentUpdatedAt: new Date(),
      },
      where: { id: order.id },
    });

    revalidatePath(`/pedidos/${order.number}`);
    revalidatePath('/minha-conta');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'MERCADO_PAGO_TEST_BUYER_EMAIL_REQUIRED'
    ) {
      redirect(getOrderPaymentPath(order.number, 'test-buyer-required'));
    }

    if (
      error instanceof Error &&
      error.message === 'MERCADO_PAGO_TEST_BUYER_EMAIL_INVALID'
    ) {
      redirect(getOrderPaymentPath(order.number, 'test-buyer-invalid'));
    }

    if (
      error instanceof Error &&
      error.message === 'MERCADO_PAGO_TEST_BUYER_EMAIL_EQUALS_CUSTOMER'
    ) {
      redirect(getOrderPaymentPath(order.number, 'test-buyer-equals-customer'));
    }

    console.error('[mercado-pago] payment link regeneration failed', {
      orderNumber: order.number,
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
            }
          : 'unknown',
    });
    redirect(getOrderPaymentPath(order.number, 'failed'));
  }

  redirect(checkoutUrl);
}
