export const paymentStatuses = [
  'PENDING',
  'IN_PROCESS',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'REFUNDED',
  'CHARGED_BACK',
  'UNKNOWN',
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: 'Aguardando pagamento',
  IN_PROCESS: 'Pagamento em analise',
  APPROVED: 'Pagamento aprovado',
  REJECTED: 'Pagamento recusado',
  CANCELLED: 'Pagamento cancelado',
  REFUNDED: 'Pagamento estornado',
  CHARGED_BACK: 'Pagamento contestado',
  UNKNOWN: 'Pagamento atualizado',
};

export function getPaymentStatusLabel(status?: string | null) {
  return paymentStatuses.includes(status as PaymentStatus)
    ? paymentStatusLabels[status as PaymentStatus]
    : paymentStatusLabels.UNKNOWN;
}

export function mapMercadoPagoStatus(status?: string | null): PaymentStatus {
  switch (status) {
    case 'approved':
      return 'APPROVED';
    case 'pending':
    case 'authorized':
      return 'PENDING';
    case 'in_process':
    case 'in_mediation':
      return 'IN_PROCESS';
    case 'rejected':
      return 'REJECTED';
    case 'cancelled':
      return 'CANCELLED';
    case 'refunded':
      return 'REFUNDED';
    case 'charged_back':
      return 'CHARGED_BACK';
    default:
      return 'UNKNOWN';
  }
}

export function shouldCancelUnprocessedOrderForPayment(status: PaymentStatus) {
  return status === 'REJECTED' || status === 'CANCELLED';
}
