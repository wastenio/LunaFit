import { getPrisma } from '@/lib/prisma';

export async function countUnreadNotifications(userId: string) {
  return getPrisma().customerNotification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

export async function listNotificationsForUser(userId: string) {
  return getPrisma().customerNotification.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      message: true,
      readAt: true,
      createdAt: true,
      order: {
        select: {
          number: true,
        },
      },
    },
    where: { userId },
  });
}
