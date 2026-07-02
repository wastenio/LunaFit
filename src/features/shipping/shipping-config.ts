type ShippingConfig = {
  baseUrl: string;
  originPostalCode: string;
  services: string | null;
  token: string;
  userAgent: string;
  webhookSecret: string | null;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function getShippingConfig(): ShippingConfig | null {
  const token = process.env.MELHOR_ENVIO_ACCESS_TOKEN?.trim();
  const originPostalCode = onlyDigits(process.env.MELHOR_ENVIO_ORIGIN_POSTAL_CODE ?? '');
  const explicitUserAgent = process.env.MELHOR_ENVIO_USER_AGENT?.trim();
  const storeEmail = process.env.NEXT_PUBLIC_STORE_EMAIL?.trim();
  const userAgent =
    explicitUserAgent ||
    (storeEmail ? `LunaFit (${storeEmail})` : '');

  if (!token || originPostalCode.length !== 8 || !userAgent) {
    return null;
  }

  return {
    baseUrl: (process.env.MELHOR_ENVIO_BASE_URL?.trim() || 'https://sandbox.melhorenvio.com.br')
      .replace(/\/+$/, ''),
    originPostalCode,
    services: process.env.MELHOR_ENVIO_SERVICES?.trim() || null,
    token,
    userAgent,
    webhookSecret: process.env.MELHOR_ENVIO_WEBHOOK_SECRET?.trim() || null,
  };
}

export function isShippingConfigured() {
  return Boolean(getShippingConfig());
}

export function getShippingWebhookSecret() {
  return process.env.MELHOR_ENVIO_WEBHOOK_SECRET?.trim() || null;
}
