import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { formatCents } from '@/lib/money';
import type { ProductView } from '../product-data';
import { getPromotionDiscount, getPromotionStatus } from '../product-promotion';

type ProductCardProps = {
  product: ProductView;
  isAuthenticated?: boolean;
};

export function ProductCard({ product, isAuthenticated = false }: ProductCardProps) {
  const hasPromo = getPromotionStatus(product) === 'active';
  const discount = getPromotionDiscount(product);
  const productHref = `/produtos/${product.slug}`;
  const purchaseHref = isAuthenticated
    ? productHref
    : `/login?callbackUrl=${encodeURIComponent(productHref)}`;

  return (
    <article className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={productHref} className="relative block aspect-[4/5] bg-zinc-100">
        <Image
          src={product.imageUrl}
          alt={product.imageAlt || product.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
          unoptimized
        />
        {hasPromo ? (
          <span className="absolute left-3 top-3 rounded bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white">
            {discount > 0 ? `-${discount}%` : 'Promocao'}
          </span>
        ) : null}
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
          <span>{product.category}</span>
          {hasPromo ? <span className="font-semibold text-rose-600">Promocao</span> : null}
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-950">{product.name}</h3>
          <p className="mt-1 text-sm text-zinc-500">{product.colors}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {hasPromo ? (
            <>
              <span className="font-semibold text-rose-600">
                {formatCents(product.promoPriceInCents ?? 0)}
              </span>
              <span className="text-zinc-400 line-through">{formatCents(product.priceInCents)}</span>
            </>
          ) : (
            <span className="font-semibold text-zinc-950">{formatCents(product.priceInCents)}</span>
          )}
        </div>
        <Link
          href={purchaseHref}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
        >
          <ShoppingBag aria-hidden="true" className="h-4 w-4" />
          {isAuthenticated ? 'Comprar' : 'Entrar para comprar'}
        </Link>
      </div>
    </article>
  );
}
