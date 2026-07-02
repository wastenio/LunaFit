import { getShippingConfig } from './shipping-config';
import type { ShippingProduct, ShippingQuoteOption } from './shipping-types';

type MelhorEnvioQuoteInput = {
  destinationPostalCode: string;
  products: ShippingProduct[];
};

export class ShippingQuoteError extends Error {
  code: 'NOT_CONFIGURED' | 'EMPTY_CART' | 'PROVIDER_ERROR' | 'NO_OPTIONS';
  status: number;

  constructor(
    code: ShippingQuoteError['code'],
    message: string,
    status = 400
  ) {
    super(message);
    this.name = 'ShippingQuoteError';
    this.code = code;
    this.status = status;
  }
}

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

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function moneyToCents(value: unknown) {
  const parsed = asNumber(value);

  return parsed === null ? null : Math.round(parsed * 100);
}

function centsToAmount(cents: number) {
  return Number((cents / 100).toFixed(2));
}

function kgFromGrams(grams: number) {
  return Number((grams / 1000).toFixed(3));
}

async function readProviderError(response: Response) {
  const text = await response.text();

  if (!text) {
    return 'Nao foi possivel calcular o frete agora.';
  }

  try {
    const payload = JSON.parse(text) as unknown;
    const record = asRecord(payload);
    const message =
      asString(record?.message) ||
      asString(record?.error) ||
      asString(record?.errors);

    return message || text.slice(0, 240);
  } catch {
    return text.slice(0, 240);
  }
}

function getDeliveryDays(option: Record<string, unknown>) {
  const customDeliveryTime = asNumber(option.custom_delivery_time);
  const deliveryTime = asNumber(option.delivery_time);
  const days = customDeliveryTime ?? deliveryTime;

  return days === null ? null : Math.max(0, Math.round(days));
}

function mapQuoteOption(option: unknown): ShippingQuoteOption | null {
  const record = asRecord(option);

  if (!record) {
    return null;
  }

  if (record.error) {
    return null;
  }

  const priceInCents = moneyToCents(record.custom_price) ?? moneyToCents(record.price);
  const serviceId = asString(record.id);

  if (!serviceId || priceInCents === null || priceInCents < 0) {
    return null;
  }

  const company = asRecord(record.company);
  const deliveryDays = getDeliveryDays(record);

  return {
    provider: 'MELHOR_ENVIO',
    serviceId,
    serviceName: asString(record.name) || `Servico ${serviceId}`,
    carrierName: asString(company?.name) || 'Melhor Envio',
    priceInCents,
    deliveryMinDays: deliveryDays,
    deliveryMaxDays: deliveryDays,
  };
}

export async function quoteWithMelhorEnvio({
  destinationPostalCode,
  products,
}: MelhorEnvioQuoteInput): Promise<ShippingQuoteOption[]> {
  const config = getShippingConfig();

  if (!config) {
    throw new ShippingQuoteError(
      'NOT_CONFIGURED',
      'A cotacao de frete ainda nao esta configurada.',
      503
    );
  }

  if (products.length === 0) {
    throw new ShippingQuoteError('EMPTY_CART', 'Seu carrinho esta vazio.');
  }

  const payload: Record<string, unknown> = {
    from: {
      postal_code: config.originPostalCode,
    },
    to: {
      postal_code: destinationPostalCode,
    },
    products: products.map((product) => ({
      height: product.packageHeightCm,
      id: product.id,
      insurance_value: centsToAmount(product.unitPriceInCents),
      length: product.packageLengthCm,
      quantity: product.quantity,
      weight: kgFromGrams(product.packageWeightInGrams),
      width: product.packageWidthCm,
    })),
    options: {
      own_hand: false,
      receipt: false,
    },
  };

  if (config.services) {
    payload.services = config.services;
  }

  const response = await fetch(`${config.baseUrl}/api/v2/me/shipment/calculate`, {
    body: JSON.stringify(payload),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      'User-Agent': config.userAgent,
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new ShippingQuoteError(
      'PROVIDER_ERROR',
      await readProviderError(response),
      response.status
    );
  }

  const data = (await response.json().catch(() => null)) as unknown;
  const options = Array.isArray(data)
    ? data.map(mapQuoteOption).filter((option): option is ShippingQuoteOption => Boolean(option))
    : [];

  if (options.length === 0) {
    throw new ShippingQuoteError(
      'NO_OPTIONS',
      'Nenhuma opcao de entrega foi encontrada para este CEP.',
      404
    );
  }

  return options.sort((a, b) => a.priceInCents - b.priceInCents);
}
