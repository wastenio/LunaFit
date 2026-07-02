import { normalizeList, slugify } from './product-utils';

export type ProductInput = {
  name: string;
  slug: string;
  description: string;
  priceInCents: number;
  promoPriceInCents: number | null;
  promoStartsAt: Date | null;
  promoEndsAt: Date | null;
  imageUrl: string;
  imageAlt: string | null;
  category: string;
  sizes: string;
  colors: string;
  stock: number;
  packageWeightInGrams: number;
  packageWidthCm: number;
  packageHeightCm: number;
  packageLengthCm: number;
  isActive: boolean;
  isFeatured: boolean;
};

type ProductInputResult =
  | {
      success: true;
      data: ProductInput;
    }
  | {
      success: false;
      errors: Record<string, string>;
    };

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function parseCurrencyToCents(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  const rawValue = asString(value).replace(/[R$\s]/g, '');

  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.includes(',')
    ? rawValue.replace(/\./g, '').replace(',', '.')
    : rawValue;
  const numberValue = Number(normalized);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return Math.round(numberValue * 100);
}

function parseInteger(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  const parsed = Number(asString(value));

  return Number.isInteger(parsed) ? parsed : null;
}

function parseDate(value: unknown) {
  const rawValue = asString(value);

  if (!rawValue) {
    return null;
  }

  const parsedDate = new Date(rawValue);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function isValidImageUrl(value: string) {
  if (value.startsWith('/')) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function readValue(source: Record<string, unknown> | FormData, key: string) {
  if (source instanceof FormData) {
    return source.get(key);
  }

  return source[key];
}

export function parseProductInput(source: Record<string, unknown> | FormData): ProductInputResult {
  const errors: Record<string, string> = {};
  const name = asString(readValue(source, 'name'));
  const slug = slugify(asString(readValue(source, 'slug')) || name);
  const description = asString(readValue(source, 'description'));
  const imageUrl = asString(readValue(source, 'imageUrl'));
  const imageAlt = asString(readValue(source, 'imageAlt')) || null;
  const category = asString(readValue(source, 'category'));
  const sizes = normalizeList(asString(readValue(source, 'sizes')));
  const colors = normalizeList(asString(readValue(source, 'colors')));
  const priceInCents = parseCurrencyToCents(readValue(source, 'price'));
  const promoPriceInCents = parseCurrencyToCents(readValue(source, 'promoPrice'));
  const rawPromoStartsAt = asString(readValue(source, 'promoStartsAt'));
  const rawPromoEndsAt = asString(readValue(source, 'promoEndsAt'));
  const promoStartsAt = parseDate(rawPromoStartsAt);
  const promoEndsAt = parseDate(rawPromoEndsAt);
  const stock = parseInteger(readValue(source, 'stock')) ?? 0;
  const packageWeightInGrams = parseInteger(readValue(source, 'packageWeightInGrams')) ?? 0;
  const packageWidthCm = parseInteger(readValue(source, 'packageWidthCm')) ?? 0;
  const packageHeightCm = parseInteger(readValue(source, 'packageHeightCm')) ?? 0;
  const packageLengthCm = parseInteger(readValue(source, 'packageLengthCm')) ?? 0;
  const isActive = asBoolean(readValue(source, 'isActive'));
  const isFeatured = asBoolean(readValue(source, 'isFeatured'));

  if (name.length < 3) {
    errors.name = 'Informe um nome com pelo menos 3 caracteres.';
  }

  if (!slug) {
    errors.slug = 'Informe um slug valido.';
  }

  if (description.length < 20) {
    errors.description = 'Descreva a peca com pelo menos 20 caracteres.';
  }

  if (priceInCents === null || priceInCents <= 0) {
    errors.price = 'Informe um preco maior que zero.';
  }

  if (promoPriceInCents !== null && promoPriceInCents <= 0) {
    errors.promoPrice = 'O preco promocional precisa ser maior que zero.';
  }

  if (
    priceInCents !== null &&
    promoPriceInCents !== null &&
    promoPriceInCents >= priceInCents
  ) {
    errors.promoPrice = 'O preco promocional precisa ser menor que o preco principal.';
  }

  if (rawPromoStartsAt && !promoStartsAt) {
    errors.promoStartsAt = 'Informe uma data inicial valida.';
  }

  if (rawPromoEndsAt && !promoEndsAt) {
    errors.promoEndsAt = 'Informe uma data final valida.';
  }

  if (promoPriceInCents === null && (promoStartsAt || promoEndsAt)) {
    errors.promoPrice = 'Informe o preco promocional para agendar a promocao.';
  }

  if (promoStartsAt && promoEndsAt && promoEndsAt <= promoStartsAt) {
    errors.promoEndsAt = 'A data final precisa ser posterior a data inicial.';
  }

  if (!imageUrl || !isValidImageUrl(imageUrl)) {
    errors.imageUrl = 'Anexe uma imagem do produto ou mantenha uma imagem existente.';
  }

  if (!category) {
    errors.category = 'Informe a categoria.';
  }

  if (!sizes) {
    errors.sizes = 'Informe ao menos um tamanho.';
  }

  if (!colors) {
    errors.colors = 'Informe ao menos uma cor.';
  }

  if (stock < 0) {
    errors.stock = 'O estoque nao pode ser negativo.';
  }

  if (packageWeightInGrams <= 0 || packageWeightInGrams > 30_000) {
    errors.packageWeightInGrams = 'Informe o peso embalado em gramas.';
  }

  if (
    packageWidthCm <= 0 ||
    packageHeightCm <= 0 ||
    packageLengthCm <= 0 ||
    packageWidthCm > 200 ||
    packageHeightCm > 200 ||
    packageLengthCm > 200
  ) {
    errors.packageDimensions = 'Informe dimensoes validas em centimetros.';
  }

  if (Object.keys(errors).length > 0 || priceInCents === null) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      name,
      slug,
      description,
      priceInCents,
      promoPriceInCents,
      promoStartsAt,
      promoEndsAt,
      imageUrl,
      imageAlt,
      category,
      sizes,
      colors,
      stock,
      packageWeightInGrams,
      packageWidthCm,
      packageHeightCm,
      packageLengthCm,
      isActive,
      isFeatured,
    },
  };
}
