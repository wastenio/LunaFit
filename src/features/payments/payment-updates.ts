import type { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import { getPrisma } from '@/lib/prisma';
import { getOrderNotification } from '@/features/orders/order-notification';
import { getPaymentNotification } from './payment-notification';
import {
  mapMercadoPagoStatus,
  shouldCancelUnprocessedOrderForPayment,
} from './payment-status';

function getPaymentEventStatus(status: string) {
  return `PAYMENT_${status}`;
}

function toDate(value?: string) {
  return value ? new Date(value) : undefined;
}

export async function applyMercadoPagoPaymentUpdate(payment: PaymentResponse) {
  const paymentId = payment.id ? String(payment.id) : '';
  const orderNumber =
    typeof payment.external_reference === 'string'
      ? payment.external_reference.trim()
      : '';

  if (!orderNumber && !paymentId) {
    console.warn('[mercado-pago] payment update without order reference', {
      paymentId: paymentId || 'unknown',
      status: payment.status,
    });
    return { updated: false, reason: 'missing-reference' };
  }

  const prisma = getPrisma();
  const paymentStatus = mapMercadoPagoStatus(payment.status);
  const paymentEventStatus = getPaymentEventStatus(paymentStatus);
  const approvedAt = toDate(payment.date_approved);

  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findFirst({
      include: {
        items: true,
        statusEvents: {
          select: { status: true },
          where: { status: paymentEventStatus },
        },
      },
      where: {
        OR: [
          ...(orderNumber ? [{ number: orderNumber }] : []),
          ...(paymentId ? [{ mercadoPagoPaymentId: paymentId }] : []),
        ],
      },
    });

    if (!order) {
      console.warn('[mercado-pago] order not found for payment update', {
        orderNumber: orderNumber || 'unknown',
        paymentId: paymentId || 'unknown',
        paymentStatus,
      });
      return { updated: false, reason: 'order-not-found' };
    }

    const paymentNotification = getPaymentNotification(paymentStatus, order.number);
    const shouldCancelOrder =
      shouldCancelUnprocessedOrderForPayment(paymentStatus) &&
      order.status !== 'CANCELLED' &&
      order.status !== 'SHIPPED' &&
      order.status !== 'COMPLETED';

    if (shouldCancelOrder) {
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
      data: {
        mercadoPagoMerchantOrderId: payment.order?.id
          ? String(payment.order.id)
          : order.mercadoPagoMerchantOrderId,
        mercadoPagoPaymentId: paymentId || order.mercadoPagoPaymentId,
        paymentApprovedAt:
          paymentStatus === 'APPROVED'
            ? (approvedAt ?? order.paymentApprovedAt ?? new Date())
            : order.paymentApprovedAt,
        paymentStatus,
        paymentUpdatedAt: new Date(),
        status: shouldCancelOrder ? 'CANCELLED' : order.status,
      },
      where: { id: order.id },
    });

    if (order.statusEvents.length === 0) {
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

    if (shouldCancelOrder) {
      const cancellationNotification = getOrderNotification('CANCELLED', updatedOrder.number);

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

    return {
      updated: true,
      orderNumber: updatedOrder.number,
      paymentStatus,
    };
  });
}
