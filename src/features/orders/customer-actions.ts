'use server';

import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer-auth';
import { isMercadoPagoConfigured } from '@/lib/mercado-pago';
import { getPrisma } from '@/lib/prisma';

type PaymentLinkResult =
  | 'failed'
  | 'not-configured'
  | 'closed';

function getOrderPaymentPath(number: string, result: PaymentLinkResult) {
  return `/pedidos/${encodeURIComponent(number)}?paymentLink=${result}`;
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

  redirect(`/pagamento/${encodeURIComponent(order.number)}`);
}
