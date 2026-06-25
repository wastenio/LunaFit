export type PromotionProduct = {
  priceInCents: number;
  promoPriceInCents: number | null;
  promoStartsAt: Date | string | null;
  promoEndsAt: Date | string | null;
};

export type PromotionStatus = 'none' | 'scheduled' | 'active' | 'ended';

function toTimestamp(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getPromotionStatus(
  product: PromotionProduct,
  now = new Date()
): PromotionStatus {
  if (typeof product.promoPriceInCents !== 'number') {
    return 'none';
  }

  const nowTimestamp = now.getTime();
  const startsAt = toTimestamp(product.promoStartsAt);
  const endsAt = toTimestamp(product.promoEndsAt);

  if (startsAt !== null && startsAt > nowTimestamp) {
    return 'scheduled';
  }

  if (endsAt !== null && endsAt <= nowTimestamp) {
    return 'ended';
  }

  return 'active';
}

export function getCurrentPriceInCents(product: PromotionProduct, now = new Date()) {
  return getPromotionStatus(product, now) === 'active'
    ? product.promoPriceInCents ?? product.priceInCents
    : product.priceInCents;
}

export function getPromotionDiscount(product: PromotionProduct) {
  if (
    typeof product.promoPriceInCents !== 'number' ||
    product.priceInCents <= 0 ||
    product.promoPriceInCents >= product.priceInCents
  ) {
    return 0;
  }

  return Math.round((1 - product.promoPriceInCents / product.priceInCents) * 100);
}
