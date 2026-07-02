import { getPrisma } from '@/lib/prisma';
import { getCurrentPriceInCents } from '@/features/products/product-promotion';
import { quoteWithMelhorEnvio, ShippingQuoteError } from './melhor-envio';
import type { ShippingProduct, ShippingQuoteOption } from './shipping-types';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function normalizePostalCode(value: string) {
  return onlyDigits(value);
}

export function assertPostalCode(value: string) {
  const postalCode = normalizePostalCode(value);

  if (postalCode.length !== 8) {
    throw new ShippingQuoteError('PROVIDER_ERROR', 'Informe um CEP com 8 digitos.', 400);
  }

  return postalCode;
}

export async function getShippingQuotesForCart(
  userId: string,
  destinationPostalCode: string
): Promise<ShippingQuoteOption[]> {
  const postalCode = assertPostalCode(destinationPostalCode);
  const cartItems = await getPrisma().cartItem.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          priceInCents: true,
          promoPriceInCents: true,
          promoStartsAt: true,
          promoEndsAt: true,
          packageWeightInGrams: true,
          packageWidthCm: true,
          packageHeightCm: true,
          packageLengthCm: true,
        },
      },
    },
    where: { userId },
  });

  const products: ShippingProduct[] = cartItems.map((item) => ({
    id: String(item.product.id),
    name: item.product.name,
    packageHeightCm: item.product.packageHeightCm,
    packageLengthCm: item.product.packageLengthCm,
    packageWeightInGrams: item.product.packageWeightInGrams,
    packageWidthCm: item.product.packageWidthCm,
    quantity: item.quantity,
    unitPriceInCents: getCurrentPriceInCents(item.product),
  }));

  return quoteWithMelhorEnvio({
    destinationPostalCode: postalCode,
    products,
  });
}

export function findShippingQuoteOption(
  options: ShippingQuoteOption[],
  serviceId: string
) {
  return options.find((option) => option.serviceId === serviceId) ?? null;
}
