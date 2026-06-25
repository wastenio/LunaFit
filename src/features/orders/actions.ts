'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { getOrderNotification } from './order-notification';
import {
  canTransitionOrderStatus,
  orderStatuses,
  type OrderStatus,
} from './order-status';

export async function updateOrderStatusAction(number: string, formData: FormData) {
  await requireAdmin();

  const status = String(formData.get('status') ?? '') as OrderStatus;

  if (!orderStatuses.includes(status)) {
    return;
  }

  const prisma = getPrisma();

  await prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      include: { items: true },
      where: { number },
    });

    if (!order || !canTransitionOrderStatus(order.status, status)) {
      return;
    }

    if (status === 'CANCELLED') {
      for (const item of order.items) {
        if (item.productId) {
          await transaction.product.updateMany({
            data: { stock: { increment: item.quantity } },
            where: { id: item.productId },
          });
        }
      }
    }

    const updatedOrder = await transaction.order.update({
      data: { status },
      where: { number },
    });
    const notification = getOrderNotification(status, order.number);

    await transaction.orderStatusEvent.create({
      data: {
        orderId: updatedOrder.id,
        status,
        ...notification,
      },
    });
    await transaction.customerNotification.create({
      data: {
        orderId: updatedOrder.id,
        userId: updatedOrder.userId,
        ...notification,
      },
    });
  });

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${number}`);
  revalidatePath('/admin', 'layout');
  revalidatePath('/minha-conta');
  revalidatePath('/notificacoes');
  revalidatePath('/', 'layout');
  revalidatePath(`/pedidos/${number}`);
}
