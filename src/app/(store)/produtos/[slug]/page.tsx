import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { formatCents } from '@/lib/money';
import { getCustomerSession } from '@/lib/customer-auth';
import { AddToCartForm } from '@/features/cart/components/AddToCartForm';
import { getPublicProductBySlug } from '@/features/products/product-data';
import {
  getPromotionDiscount,
  getPromotionStatus,
} from '@/features/products/product-promotion';
import { splitList } from '@/features/products/product-utils';

export const dynamic = 'force-dynamic';

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) {
    return {
      title: 'Produto nao encontrado | LunaFit',
    };
  }

  return {
    description: product.description,
    title: `${product.name} | LunaFit`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [product, session] = await Promise.all([
    getPublicProductBySlug(slug),
    getCustomerSession(),
  ]);

  if (!product) {
    notFound();
  }

  const sizes = splitList(product.sizes);
  const colors = splitList(product.colors);
  const hasPromo = getPromotionStatus(product) === 'active';
  const discount = getPromotionDiscount(product);

  return (
    <main>
      <section className="mx-auto max-w-6xl px-5 py-12">
        <Link href="/produtos" className="text-sm font-semibold text-rose-700 hover:text-zinc-950">
          Voltar para produtos
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-zinc-100">
            <Image
              src={product.imageUrl}
              alt={product.imageAlt || product.name}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="lg:pt-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-600">
              {product.category}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">{product.name}</h1>

            {hasPromo ? (
              <p className="mt-4 inline-flex rounded bg-rose-100 px-3 py-1.5 text-sm font-semibold text-rose-700">
                {discount > 0 ? `${discount}% de desconto` : 'Produto em promocao'}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-end gap-3">
              {hasPromo ? (
                <>
                  <span className="text-3xl font-semibold text-rose-600">
                    {formatCents(product.promoPriceInCents ?? 0)}
                  </span>
                  <span className="pb-1 text-lg text-zinc-400 line-through">
                    {formatCents(product.priceInCents)}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-semibold text-zinc-950">
                  {formatCents(product.priceInCents)}
                </span>
              )}
            </div>
            {hasPromo && product.promoEndsAt ? (
              <p className="mt-3 text-sm font-medium text-rose-700">
                Oferta valida ate{' '}
                {new Intl.DateTimeFormat('pt-BR', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                }).format(new Date(product.promoEndsAt))}
              </p>
            ) : null}

            <p className="mt-6 text-base leading-8 text-zinc-600">{product.description}</p>

            <div className="mt-8 grid gap-5 border-y border-zinc-200 py-6 sm:grid-cols-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Tamanhos</h2>
                <p className="mt-2 text-sm text-zinc-600">{sizes.join(', ')}</p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Cores</h2>
                <p className="mt-2 text-sm text-zinc-600">{colors.join(', ')}</p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Estoque</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  {product.stock > 0 ? `${product.stock} disponivel(is)` : 'Sob consulta'}
                </p>
              </div>
            </div>

            <AddToCartForm
              productId={product.id}
              productSlug={product.slug}
              sizes={sizes}
              colors={colors}
              stock={product.stock}
              isAuthenticated={Boolean(session)}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
