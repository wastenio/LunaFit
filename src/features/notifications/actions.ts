'use server';

import { revalidatePath } from 'next/cache';
import { getCustomerSession } from '@/lib/customer-auth';
import { getPrisma } from '@/lib/prisma';

export async function markAllNotificationsReadAction() {
  const session = await getCustomerSession();

  if (!session) {
    return;
  }

  await getPrisma().customerNotification.updateMany({
    data: { readAt: new Date() },
    where: {
      userId: session.user.id,
      readAt: null,
    },
  });

  revalidatePath('/notificacoes');
  revalidatePath('/', 'layout');
}
