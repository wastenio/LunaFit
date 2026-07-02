type TrackingNotificationInput = {
  carrierName?: string | null;
  orderNumber: string;
  trackingCode: string;
  trackingUrl?: string | null;
};

type ShippingStatusNotificationInput = {
  event: string;
  orderNumber: string;
  trackingCode?: string | null;
};

export function getTrackingNotification({
  carrierName,
  orderNumber,
  trackingCode,
  trackingUrl,
}: TrackingNotificationInput) {
  const carrier = carrierName ? ` pela ${carrierName}` : '';
  const tracking = trackingUrl
    ? `${trackingCode}. Acompanhe pelo link disponivel no pedido.`
    : trackingCode;

  return {
    title: 'Rastreio disponivel',
    message: `Seu pedido ${orderNumber} foi enviado${carrier}. Codigo de rastreio: ${tracking}`,
  };
}

export function getShippingStatusNotification({
  event,
  orderNumber,
  trackingCode,
}: ShippingStatusNotificationInput) {
  switch (event) {
    case 'order.delivered':
      return {
        title: 'Pedido entregue',
        message: `Seu pedido ${orderNumber} foi entregue.`,
      };
    case 'order.posted':
      return {
        title: 'Pedido postado',
        message: trackingCode
          ? `Seu pedido ${orderNumber} foi postado. Codigo de rastreio: ${trackingCode}.`
          : `Seu pedido ${orderNumber} foi postado pela transportadora.`,
      };
    case 'order.undelivered':
    case 'order.paused':
    case 'order.suspended':
      return {
        title: 'Entrega precisa de atencao',
        message: `Recebemos uma atualizacao importante sobre a entrega do pedido ${orderNumber}.`,
      };
    default:
      return {
        title: 'Entrega atualizada',
        message: `A entrega do pedido ${orderNumber} recebeu uma nova atualizacao.`,
      };
  }
}
