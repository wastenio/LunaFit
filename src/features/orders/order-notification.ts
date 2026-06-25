import type { OrderStatus } from './order-status';

type OrderNotification = {
  title: string;
  message: string;
};

export function getOrderNotification(
  status: OrderStatus,
  orderNumber: string
): OrderNotification {
  const notifications: Record<OrderStatus, OrderNotification> = {
    PENDING: {
      title: 'Pedido enviado',
      message: `Seu pedido ${orderNumber} foi enviado e aguarda recebimento pela equipe LunaFit.`,
    },
    RECEIVED: {
      title: 'Pedido recebido',
      message: `A equipe LunaFit recebeu o pedido ${orderNumber} e iniciou o atendimento.`,
    },
    CONTACTED: {
      title: 'Contato realizado',
      message: `A equipe registrou o contato referente ao pedido ${orderNumber}.`,
    },
    CONFIRMED: {
      title: 'Pedido confirmado',
      message: `Seu pedido ${orderNumber} foi confirmado e esta sendo preparado.`,
    },
    SHIPPED: {
      title: 'Pedido enviado para entrega',
      message: `Seu pedido ${orderNumber} foi enviado para entrega.`,
    },
    COMPLETED: {
      title: 'Pedido concluido',
      message: `O pedido ${orderNumber} foi concluido.`,
    },
    CANCELLED: {
      title: 'Pedido cancelado',
      message: `O pedido ${orderNumber} foi cancelado. Entre em contato se precisar de ajuda.`,
    },
  };

  return notifications[status];
}
