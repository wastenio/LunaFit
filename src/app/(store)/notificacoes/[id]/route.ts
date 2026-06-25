import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer-auth';
import { getPrisma } from '@/lib/prisma';

type NotificationRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: NotificationRouteProps) {
  const { id } = await params;
  const session = await getCustomerSession();

  if (!session) {
    redirect('/login?callbackUrl=/notificacoes');
  }

  const notificationId = Number(id);

  if (!Number.isInteger(notificationId)) {
    redirect('/notificacoes');
  }

  const notification = await getPrisma().customerNotification.findFirst({
    select: {
      id: true,
      readAt: true,
      order: {
        select: {
          number: true,
        },
      },
    },
    where: {
      id: notificationId,
      userId: session.user.id,
    },
  });

  if (!notification) {
    redirect('/notificacoes');
  }

  if (!notification.readAt) {
    await getPrisma().customerNotification.update({
      data: { readAt: new Date() },
      where: { id: notification.id },
    });
  }

  redirect(notification.order ? `/pedidos/${notification.order.number}` : '/notificacoes');
}
