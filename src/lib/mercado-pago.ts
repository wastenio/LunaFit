import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Payment,
  PaymentRefund,
  Preference,
  WebhookSignatureValidator,
} from 'mercadopago';

type CheckoutPreferenceOrder = {
  id: number;
  number: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  postalCode: string;
  addressLine: string;
  addressNumber: string;
  addressComplement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  totalInCents: number;
  shippingInCents: number;
};

type CheckoutPreferenceItem = {
  id: number;
  productId: number | null;
  productName: string;
  imageUrl: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceInCents: number;
};

type CreateCheckoutPreferenceInput = {
  order: CheckoutPreferenceOrder;
  items: CheckoutPreferenceItem[];
  requestUrl: string;
};

type PreferenceBody = Parameters<Preference['create']>[0]['body'];
type PreferenceResponse = Awaited<ReturnType<Preference['create']>>;

let mercadoPagoConfig: MercadoPagoConfig | null = null;
let preferenceClient: Preference | null = null;
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

export function getMercadoPagoPreferenceClient() {
  if (!preferenceClient) {
    preferenceClient = new Preference(getMercadoPagoConfig());
  }

  return preferenceClient;
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

function getAppBaseUrl(requestUrl: string) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    new URL(requestUrl).origin;

  return configuredUrl.replace(/\/+$/, '');
}

function centsToAmount(cents: number) {
  return Number((cents / 100).toFixed(2));
}

function splitName(fullName: string) {
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
  const name = parts.shift() || fullName;

  return {
    name,
    surname: parts.join(' ') || undefined,
  };
}

function splitPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');

  if (digits.length >= 10) {
    return {
      area_code: digits.slice(0, 2),
      number: digits.slice(2),
    };
  }

  return { number: digits || phone };
}

function getAbsoluteUrl(url: string, baseUrl: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

function isSandboxCredentials() {
  return (
    process.env.MERCADO_PAGO_ACCESS_TOKEN?.startsWith('TEST-') ||
    process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY?.startsWith('TEST-')
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function getCheckoutPayerEmail(customerEmail: string) {
  if (!isSandboxCredentials()) {
    return customerEmail;
  }

  const testBuyerEmail = process.env.MERCADO_PAGO_TEST_BUYER_EMAIL?.trim();

  if (!testBuyerEmail) {
    throw new Error('MERCADO_PAGO_TEST_BUYER_EMAIL_REQUIRED');
  }

  if (!isValidEmail(testBuyerEmail)) {
    throw new Error('MERCADO_PAGO_TEST_BUYER_EMAIL_INVALID');
  }

  if (testBuyerEmail.toLowerCase() === customerEmail.trim().toLowerCase()) {
    throw new Error('MERCADO_PAGO_TEST_BUYER_EMAIL_EQUALS_CUSTOMER');
  }

  return testBuyerEmail;
}

export function getMercadoPagoCheckoutUrl(preference: PreferenceResponse) {
  if (isSandboxCredentials()) {
    return preference.sandbox_init_point || preference.init_point || null;
  }

  return preference.init_point || preference.sandbox_init_point || null;
}

export async function createMercadoPagoCheckoutPreference({
  order,
  items,
  requestUrl,
}: CreateCheckoutPreferenceInput) {
  const baseUrl = getAppBaseUrl(requestUrl);
  const customerName = splitName(order.customerName);
  const payerEmail = getCheckoutPayerEmail(order.customerEmail);
  const preferenceBody: PreferenceBody = {
    auto_return: 'approved',
    back_urls: {
      success: `${baseUrl}/pedidos/${encodeURIComponent(order.number)}?payment=success`,
      pending: `${baseUrl}/pedidos/${encodeURIComponent(order.number)}?payment=pending`,
      failure: `${baseUrl}/pedidos/${encodeURIComponent(order.number)}?payment=failure`,
    },
    external_reference: order.number,
    items: items.map((item) => ({
      id: String(item.productId ?? item.id),
      title: item.productName,
      description: `${item.size} - ${item.color}`,
      picture_url: getAbsoluteUrl(item.imageUrl, baseUrl),
      category_id: 'fashion',
      quantity: item.quantity,
      currency_id: 'BRL',
      unit_price: centsToAmount(item.unitPriceInCents),
    })),
    metadata: {
      order_id: order.id,
      order_number: order.number,
    },
    notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    payer: {
      ...customerName,
      ...(payerEmail ? { email: payerEmail } : {}),
      phone: splitPhone(order.phone),
      address: {
        zip_code: order.postalCode.replace(/\D/g, ''),
        street_name: order.addressLine,
        street_number: order.addressNumber,
      },
    },
    payment_methods: {
      installments: 6,
    },
    shipments: {
      cost: centsToAmount(order.shippingInCents),
      free_shipping: order.shippingInCents === 0,
      receiver_address: {
        zip_code: order.postalCode.replace(/\D/g, ''),
        street_name: order.addressLine,
        street_number: order.addressNumber,
        floor: order.addressComplement || undefined,
        city_name: order.city,
        state_name: order.state,
      },
    },
    statement_descriptor: 'LUNAFIT',
  };

  return getMercadoPagoPreferenceClient().create({ body: preferenceBody });
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
