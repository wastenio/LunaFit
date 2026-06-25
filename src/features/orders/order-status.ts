export const orderStatuses = [
  'PENDING',
  'RECEIVED',
  'CONTACTED',
  'CONFIRMED',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const orderStatusesAwaitingAction: OrderStatus[] = [
  'PENDING',
  'RECEIVED',
  'CONTACTED',
  'CONFIRMED',
  'SHIPPED',
];

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Aguardando recebimento',
  RECEIVED: 'Pedido recebido',
  CONTACTED: 'Cliente contatado',
  CONFIRMED: 'Pedido confirmado',
  SHIPPED: 'Pedido enviado',
  COMPLETED: 'Pedido concluido',
  CANCELLED: 'Pedido cancelado',
};

export function getOrderStatusLabel(status: string) {
  return orderStatuses.includes(status as OrderStatus)
    ? orderStatusLabels[status as OrderStatus]
    : status;
}

const orderStatusSequence: OrderStatus[] = [
  'PENDING',
  'RECEIVED',
  'CONTACTED',
  'CONFIRMED',
  'SHIPPED',
  'COMPLETED',
];

export function getNextOrderStatus(status: string): OrderStatus | null {
  const currentIndex = orderStatusSequence.indexOf(status as OrderStatus);

  if (currentIndex < 0 || currentIndex === orderStatusSequence.length - 1) {
    return null;
  }

  return orderStatusSequence[currentIndex + 1];
}

export function getAvailableOrderStatuses(status: string): OrderStatus[] {
  if (!orderStatuses.includes(status as OrderStatus)) {
    return [];
  }

  const currentStatus = status as OrderStatus;

  if (currentStatus === 'CANCELLED' || currentStatus === 'COMPLETED') {
    return [currentStatus];
  }

  const nextStatus = getNextOrderStatus(currentStatus);
  return nextStatus ? [currentStatus, nextStatus, 'CANCELLED'] : [currentStatus, 'CANCELLED'];
}

export function canTransitionOrderStatus(currentStatus: string, nextStatus: OrderStatus) {
  if (currentStatus === nextStatus) {
    return false;
  }

  if (nextStatus === 'CANCELLED') {
    return currentStatus !== 'CANCELLED' && currentStatus !== 'COMPLETED';
  }

  return getNextOrderStatus(currentStatus) === nextStatus;
}
