import type { PaymentStatus } from './payment-status';

type PaymentNotification = {
  title: string;
  message: string;
};

export function getPaymentNotification(
  status: PaymentStatus,
  orderNumber: string
): PaymentNotification {
  const notifications: Record<PaymentStatus, PaymentNotification> = {
    PENDING: {
      title: 'Aguardando pagamento',
      message: `Finalize o pagamento do pedido ${orderNumber} pelo ambiente seguro do Mercado Pago.`,
    },
    IN_PROCESS: {
      title: 'Pagamento em analise',
      message: `O pagamento do pedido ${orderNumber} esta em analise pelo Mercado Pago.`,
    },
    APPROVED: {
      title: 'Pagamento aprovado',
      message: `O pagamento do pedido ${orderNumber} foi aprovado. A equipe LunaFit dara sequencia ao atendimento.`,
    },
    REJECTED: {
      title: 'Pagamento recusado',
      message: `O pagamento do pedido ${orderNumber} foi recusado. Voce pode tentar novamente ou falar com a LunaFit.`,
    },
    CANCELLED: {
      title: 'Pagamento cancelado',
      message: `O pagamento do pedido ${orderNumber} foi cancelado.`,
    },
    REFUND_IN_PROCESS: {
      title: 'Reembolso em processamento',
      message: `O reembolso do pedido ${orderNumber} foi solicitado e esta em processamento pelo Mercado Pago.`,
    },
    REFUNDED: {
      title: 'Pagamento estornado',
      message: `O pagamento do pedido ${orderNumber} foi estornado. Entre em contato se precisar de ajuda.`,
    },
    CHARGED_BACK: {
      title: 'Pagamento contestado',
      message: `O pagamento do pedido ${orderNumber} entrou em contestacao. A equipe LunaFit acompanhara o caso.`,
    },
    UNKNOWN: {
      title: 'Pagamento atualizado',
      message: `Recebemos uma atualizacao de pagamento para o pedido ${orderNumber}.`,
    },
  };

  return notifications[status];
}
