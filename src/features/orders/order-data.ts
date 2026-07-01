import { getPrisma } from '@/lib/prisma';
import { orderStatusesAwaitingAction } from './order-status';

export async function listOrdersForUser(userId: string) {
  return getPrisma().order.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      number: true,
      paymentStatus: true,
      status: true,
      totalInCents: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
    where: { userId },
  });
}

export async function getOrderForUser(userId: string, number: string) {
  return getPrisma().order.findFirst({
    include: {
      items: {
        orderBy: { id: 'asc' },
      },
      statusEvents: {
        orderBy: { createdAt: 'asc' },
      },
    },
    where: {
      number,
      userId,
    },
  });
}

export async function listOrdersForAdmin() {
  return getPrisma().order.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      number: true,
      status: true,
      paymentStatus: true,
      customerName: true,
      customerEmail: true,
      phone: true,
      totalInCents: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });
}

export async function getOrderForAdmin(number: string) {
  return getPrisma().order.findUnique({
    include: {
      items: {
        orderBy: { id: 'asc' },
      },
      statusEvents: {
        orderBy: { createdAt: 'asc' },
      },
    },
    where: { number },
  });
}

export async function countOrdersAwaitingAction() {
  return getPrisma().order.count({
    where: {
      paymentStatus: 'APPROVED',
      status: {
        in: orderStatusesAwaitingAction,
      },
    },
  });
}
