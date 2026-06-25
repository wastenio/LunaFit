import { getPrisma } from '@/lib/prisma';
import { getCurrentPriceInCents } from '@/features/products/product-promotion';

export type CartItemView = {
  id: number;
  quantity: number;
  size: string;
  color: string;
  unitPriceInCents: number;
  totalInCents: number;
  product: {
    id: number;
    name: string;
    slug: string;
    imageUrl: string;
    imageAlt: string | null;
    stock: number;
    isActive: boolean;
  };
};

export type CartView = {
  items: CartItemView[];
  itemCount: number;
  subtotalInCents: number;
};

export async function getCartForUser(userId: string): Promise<CartView> {
  const items = await getPrisma().cartItem.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          imageAlt: true,
          stock: true,
          isActive: true,
          priceInCents: true,
          promoPriceInCents: true,
          promoStartsAt: true,
          promoEndsAt: true,
        },
      },
    },
    where: { userId },
  });

  const viewItems = items.map((item) => {
    const unitPriceInCents = getCurrentPriceInCents(item.product);

    return {
      id: item.id,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      unitPriceInCents,
      totalInCents: unitPriceInCents * item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        imageUrl: item.product.imageUrl,
        imageAlt: item.product.imageAlt,
        stock: item.product.stock,
        isActive: item.product.isActive,
      },
    };
  });

  return {
    items: viewItems,
    itemCount: viewItems.reduce((total, item) => total + item.quantity, 0),
    subtotalInCents: viewItems.reduce((total, item) => total + item.totalInCents, 0),
  };
}

export async function getCartItemCount(userId: string) {
  const result = await getPrisma().cartItem.aggregate({
    _sum: { quantity: true },
    where: { userId },
  });

  return result._sum.quantity ?? 0;
}
