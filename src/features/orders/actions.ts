'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { refundMercadoPagoPayment } from '@/lib/mercado-pago';
import { getPrisma } from '@/lib/prisma';
import { getPaymentNotification } from '@/features/payments/payment-notification';
import { mapMercadoPagoRefundStatus } from '@/features/payments/payment-status';
import { getTrackingNotification } from '@/features/shipping/shipping-notification';
import { getOrderNotification } from './order-notification';
import {
  canTransitionOrderStatus,
  orderStatuses,
  type OrderStatus,
} from './order-status';

type RefundActionResult =
  | 'success'
  | 'already-refunded'
  | 'missing-payment'
  | 'missing-confirmation'
  | 'completed'
  | 'not-approved'
  | 'not-found'
  | 'failed';

type ShippingActionResult =
  | 'success'
  | 'invalid'
  | 'not-found';

function getAdminOrderPath(number: string, result: RefundActionResult) {
  return `/admin/pedidos/${encodeURIComponent(number)}?refund=${result}`;
}

function getAdminShippingPath(number: string, result: ShippingActionResult) {
  return `/admin/pedidos/${encodeURIComponent(number)}?shipping=${result}`;
}

function amountToCents(amount?: number | null) {
  return typeof amount === 'number' ? Math.round(amount * 100) : null;
}

function parseRefundDate(value?: string) {
  return value ? new Date(value) : new Date();
}

function getPaymentEventStatus(status: string) {
  return `PAYMENT_${status}`;
}

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function parseTrackingUrl(value: string) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

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

export async function updateOrderShippingAction(number: string, formData: FormData) {
  await requireAdmin();

  const trackingCode = readText(formData, 'shippingTrackingCode');
  const rawTrackingUrl = readText(formData, 'shippingTrackingUrl');
  const carrierName = readText(formData, 'shippingCarrierName');
  const trackingUrl = parseTrackingUrl(rawTrackingUrl);

  if (trackingCode.length < 4 || trackingCode.length > 80 || (rawTrackingUrl && !trackingUrl)) {
    redirect(getAdminShippingPath(number, 'invalid'));
  }

  const prisma = getPrisma();

  const order = await prisma.order.findUnique({
    select: {
      id: true,
      number: true,
      status: true,
      shippingCarrierName: true,
      userId: true,
    },
    where: { number },
  });

  if (!order) {
    redirect('/admin/pedidos?shipping=not-found');
  }

  const shouldMarkAsShipped = order.status !== 'CANCELLED' && order.status !== 'COMPLETED';
  const notification = getTrackingNotification({
    carrierName: carrierName || order.shippingCarrierName,
    orderNumber: order.number,
    trackingCode,
    trackingUrl,
  });

  await prisma.$transaction(async (transaction) => {
    const updatedOrder = await transaction.order.update({
      data: {
        shippingCarrierName: carrierName || order.shippingCarrierName,
        shippingStatus: 'tracking_registered',
        shippingTrackingCode: trackingCode,
        shippingTrackingUrl: trackingUrl,
        shippingUpdatedAt: new Date(),
        status: shouldMarkAsShipped ? 'SHIPPED' : order.status,
      },
      where: { id: order.id },
    });

    await transaction.orderStatusEvent.create({
      data: {
        orderId: updatedOrder.id,
        status: shouldMarkAsShipped ? 'SHIPPED' : 'SHIPPING_TRACKING_UPDATED',
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
  redirect(getAdminShippingPath(number, 'success'));
}

export async function refundOrderPaymentAction(number: string, formData: FormData) {
  await requireAdmin();

  if (formData.get('confirmRefund') !== 'yes') {
    redirect(getAdminOrderPath(number, 'missing-confirmation'));
  }

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    select: {
      id: true,
      number: true,
      status: true,
      paymentStatus: true,
      mercadoPagoPaymentId: true,
    },
    where: { number },
  });

  if (!order) {
    redirect('/admin/pedidos?refund=not-found');
  }

  if (order.paymentStatus === 'REFUNDED' || order.paymentStatus === 'REFUND_IN_PROCESS') {
    redirect(getAdminOrderPath(order.number, 'already-refunded'));
  }

  if (order.status === 'COMPLETED') {
    redirect(getAdminOrderPath(order.number, 'completed'));
  }

  if (order.paymentStatus !== 'APPROVED') {
    redirect(getAdminOrderPath(order.number, 'not-approved'));
  }

  if (!order.mercadoPagoPaymentId) {
    redirect(getAdminOrderPath(order.number, 'missing-payment'));
  }

  try {
    const refund = await refundMercadoPagoPayment({
      orderNumber: order.number,
      paymentId: order.mercadoPagoPaymentId,
    });
    const paymentStatus = mapMercadoPagoRefundStatus(refund.status);
    const paymentEventStatus = getPaymentEventStatus(paymentStatus);
    const paymentNotification = getPaymentNotification(paymentStatus, order.number);
    const cancellationNotification = getOrderNotification('CANCELLED', order.number);

    await prisma.$transaction(async (transaction) => {
      const currentOrder = await transaction.order.findUnique({
        include: {
          items: true,
          statusEvents: {
            select: { status: true },
            where: {
              status: {
                in: [paymentEventStatus, 'CANCELLED'],
              },
            },
          },
        },
        where: { id: order.id },
      });

      if (!currentOrder) {
        return;
      }

      const shouldCancelOrder =
        currentOrder.status !== 'CANCELLED' && currentOrder.status !== 'COMPLETED';

      if (shouldCancelOrder) {
        for (const item of currentOrder.items) {
          if (item.productId) {
            await transaction.product.updateMany({
              data: { stock: { increment: item.quantity } },
              where: { id: item.productId },
            });
          }
        }
      }

      const refundAmountInCents =
        amountToCents(refund.amount_refunded_to_payer) ?? amountToCents(refund.amount);

      const updatedOrder = await transaction.order.update({
        data: {
          paymentRefundAmountInCents: refundAmountInCents,
          paymentRefundId: refund.id ? String(refund.id) : currentOrder.paymentRefundId,
          paymentRefundStatus: refund.status ?? currentOrder.paymentRefundStatus,
          paymentRefundedAt:
            paymentStatus === 'REFUNDED'
              ? parseRefundDate(refund.date_created)
              : currentOrder.paymentRefundedAt,
          paymentRefundUpdatedAt: new Date(),
          paymentStatus,
          paymentUpdatedAt: new Date(),
          status: shouldCancelOrder ? 'CANCELLED' : currentOrder.status,
        },
        where: { id: currentOrder.id },
      });

      const hasPaymentEvent = currentOrder.statusEvents.some(
        (event) => event.status === paymentEventStatus
      );

      if (!hasPaymentEvent) {
        await transaction.orderStatusEvent.create({
          data: {
            orderId: updatedOrder.id,
            status: paymentEventStatus,
            ...paymentNotification,
          },
        });
        await transaction.customerNotification.create({
          data: {
            orderId: updatedOrder.id,
            userId: updatedOrder.userId,
            ...paymentNotification,
          },
        });
      }

      const hasCancellationEvent = currentOrder.statusEvents.some(
        (event) => event.status === 'CANCELLED'
      );

      if (shouldCancelOrder && !hasCancellationEvent) {
        await transaction.orderStatusEvent.create({
          data: {
            orderId: updatedOrder.id,
            status: 'CANCELLED',
            ...cancellationNotification,
          },
        });
        await transaction.customerNotification.create({
          data: {
            orderId: updatedOrder.id,
            userId: updatedOrder.userId,
            ...cancellationNotification,
          },
        });
      }
    });
  } catch (error) {
    console.error('[mercado-pago] failed to refund payment', {
      orderNumber: order.number,
      paymentId: order.mercadoPagoPaymentId,
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
            }
          : 'unknown',
    });
    redirect(getAdminOrderPath(order.number, 'failed'));
  }

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${order.number}`);
  revalidatePath('/admin', 'layout');
  revalidatePath('/minha-conta');
  revalidatePath('/notificacoes');
  revalidatePath('/', 'layout');
  revalidatePath(`/pedidos/${order.number}`);
  redirect(getAdminOrderPath(order.number, 'success'));
}
