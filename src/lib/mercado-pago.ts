import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Payment,
  PaymentRefund,
  WebhookSignatureValidator,
} from 'mercadopago';

let mercadoPagoConfig: MercadoPagoConfig | null = null;
let paymentClient: Payment | null = null;
let paymentRefundClient: PaymentRefund | null = null;

function getAccessToken() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    throw new Error('MERCADO_PAGO_NOT_CONFIGURED');
  }

  return accessToken;
}

function getMercadoPagoConfig() {
  if (!mercadoPagoConfig) {
    mercadoPagoConfig = new MercadoPagoConfig({
      accessToken: getAccessToken(),
      options: { timeout: 10000 },
    });
  }

  return mercadoPagoConfig;
}

export function isMercadoPagoConfigured() {
  return Boolean(
    process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() &&
      process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim()
  );
}

export function getMercadoPagoPaymentClient() {
  if (!paymentClient) {
    paymentClient = new Payment(getMercadoPagoConfig());
  }

  return paymentClient;
}

export function getMercadoPagoPaymentRefundClient() {
  if (!paymentRefundClient) {
    paymentRefundClient = new PaymentRefund(getMercadoPagoConfig());
  }

  return paymentRefundClient;
}

export async function refundMercadoPagoPayment({
  orderNumber,
  paymentId,
}: {
  orderNumber: string;
  paymentId: string;
}) {
  return getMercadoPagoPaymentRefundClient().total({
    payment_id: paymentId,
    requestOptions: {
      idempotencyKey: `lunafit-refund-${orderNumber}-${paymentId}`,
    },
  });
}

export function validateMercadoPagoWebhook({
  dataId,
  request,
}: {
  dataId: string;
  request: Request;
}) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new Error('MERCADO_PAGO_WEBHOOK_NOT_CONFIGURED');
  }

  WebhookSignatureValidator.validate({
    xSignature: request.headers.get('x-signature'),
    xRequestId: request.headers.get('x-request-id'),
    dataId,
    secret,
    toleranceSeconds: 600,
  });
}

export function isInvalidMercadoPagoWebhookSignature(error: unknown) {
  return error instanceof InvalidWebhookSignatureError;
}
