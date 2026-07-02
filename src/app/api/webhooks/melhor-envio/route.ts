import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getShippingWebhookSecret } from '@/features/shipping/shipping-config';
import { getShippingStatusNotification } from '@/features/shipping/shipping-notification';

export const runtime = 'nodejs';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return '';
}

function verifySignature(body: string, signature: string, secret: string) {
  if (!signature) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(body).digest('base64');
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function getOrderNumberFromTags(data: Record<string, unknown>) {
  const tags = Array.isArray(data.tags) ? data.tags : [];

  for (const tagItem of tags) {
    const tag = asString(asRecord(tagItem)?.tag);

    if (tag.startsWith('LF-')) {
      return tag;
    }
  }

  return '';
}

function getEventStatus(event: string) {
  return `SHIPPING_${event.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}

function getOrderStatusFromEvent(event: string) {
  if (event === 'order.delivered') {
    return 'COMPLETED';
  }

  if (event === 'order.posted') {
    return 'SHIPPED';
  }

  return null;
}

function toDate(value: unknown) {
  const rawValue = asString(value);

  if (!rawValue) {
    return undefined;
  }

  const date = new Date(rawValue);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function POST(request: Request) {
  const secret = getShippingWebhookSecret();
  const signature = request.headers.get('x-me-signature') ?? '';
  const rawBody = await request.text();

  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = asRecord(parsedPayload);
  const event = asString(payload?.event);
  const data = asRecord(payload?.data);

  if (!event || !data) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const labelId = asString(data.id);
  const protocol = asString(data.protocol);
  const orderNumber = getOrderNumberFromTags(data);
  const trackingCode = asString(data.tracking);
  const trackingUrl = asString(data.tracking_url) || asString(data.self_tracking);
  const shippingStatus = asString(data.status) || event;

  if (!labelId && !protocol && !orderNumber) {
    return NextResponse.json({ updated: false, reason: 'missing-reference' });
  }

  const prisma = getPrisma();
  const order = await prisma.order.findFirst({
    include: {
      statusEvents: {
        select: { status: true },
        where: { status: getEventStatus(event) },
      },
    },
    where: {
      OR: [
        ...(labelId ? [{ shippingLabelId: labelId }] : []),
        ...(protocol ? [{ shippingProtocol: protocol }] : []),
        ...(orderNumber ? [{ number: orderNumber }] : []),
      ],
    },
  });

  if (!order) {
    return NextResponse.json({ updated: false, reason: 'order-not-found' });
  }

  const nextOrderStatus = getOrderStatusFromEvent(event);
  const notification = getShippingStatusNotification({
    event,
    orderNumber: order.number,
    trackingCode: trackingCode || order.shippingTrackingCode,
  });

  await prisma.$transaction(async (transaction) => {
    const updatedOrder = await transaction.order.update({
      data: {
        shippingDeliveredAt:
          event === 'order.delivered'
            ? (toDate(data.delivered_at) ?? order.shippingDeliveredAt ?? new Date())
            : order.shippingDeliveredAt,
        shippingLabelId: labelId || order.shippingLabelId,
        shippingPostedAt:
          event === 'order.posted'
            ? (toDate(data.posted_at) ?? order.shippingPostedAt ?? new Date())
            : order.shippingPostedAt,
        shippingProtocol: protocol || order.shippingProtocol,
        shippingStatus,
        shippingTrackingCode: trackingCode || order.shippingTrackingCode,
        shippingTrackingUrl: trackingUrl || order.shippingTrackingUrl,
        shippingUpdatedAt: new Date(),
        status:
          nextOrderStatus && order.status !== 'CANCELLED'
            ? nextOrderStatus
            : order.status,
      },
      where: { id: order.id },
    });

    if (order.statusEvents.length === 0) {
      await transaction.orderStatusEvent.create({
        data: {
          orderId: updatedOrder.id,
          status: getEventStatus(event),
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
    }
  });

  return NextResponse.json({ updated: true });
}
