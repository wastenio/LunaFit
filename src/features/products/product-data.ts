import type { Prisma } from '@prisma/client';
import { getPrisma } from '@/lib/prisma';
import { getPromotionStatus } from './product-promotion';

export const productPublicSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  priceInCents: true,
  promoPriceInCents: true,
  promoStartsAt: true,
  promoEndsAt: true,
  imageUrl: true,
  imageAlt: true,
  category: true,
  sizes: true,
  colors: true,
  stock: true,
  packageWeightInGrams: true,
  packageWidthCm: true,
  packageHeightCm: true,
  packageLengthCm: true,
  isActive: true,
  isFeatured: true,
} satisfies Prisma.ProductSelect;

export type ProductView = Prisma.ProductGetPayload<{
  select: typeof productPublicSelect;
}>;

export async function listPublicProducts() {
  return getPrisma().product.findMany({
    orderBy: { createdAt: 'desc' },
    select: productPublicSelect,
    where: { isActive: true },
  });
}

export async function listFeaturedProducts(take = 6) {
  return getPrisma().product.findMany({
    orderBy: { createdAt: 'desc' },
    select: productPublicSelect,
    take,
    where: {
      isActive: true,
      isFeatured: true,
    },
  });
}

export async function listLatestProducts(take = 6) {
  return getPrisma().product.findMany({
    orderBy: { createdAt: 'desc' },
    select: productPublicSelect,
    take,
    where: { isActive: true },
  });
}

export async function listActivePromotions(take = 8) {
  const products = await getPrisma().product.findMany({
    orderBy: { updatedAt: 'desc' },
    select: productPublicSelect,
    where: {
      isActive: true,
      promoPriceInCents: { not: null },
    },
  });

  return products.filter((product) => getPromotionStatus(product) === 'active').slice(0, take);
}

export async function getPublicProductBySlug(slug: string) {
  return getPrisma().product.findFirst({
    select: productPublicSelect,
    where: {
      isActive: true,
      slug,
    },
  });
}

export async function listProductsForAdmin() {
  return getPrisma().product.findMany({
    orderBy: { createdAt: 'desc' },
    select: productPublicSelect,
  });
}

export async function getProductForAdmin(id: number) {
  return getPrisma().product.findUnique({
    select: productPublicSelect,
    where: { id },
  });
}

export async function findProductById(id: number) {
  return getPrisma().product.findUnique({
    select: productPublicSelect,
    where: { id },
  });
}
