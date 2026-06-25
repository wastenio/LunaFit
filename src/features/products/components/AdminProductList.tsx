/* eslint-disable @next/next/no-img-element */

import { formatCents } from '@/lib/money';
import { deleteProductAction } from '../actions';
import type { ProductView } from '../product-data';
import { getPromotionDiscount, getPromotionStatus } from '../product-promotion';

type AdminProductListProps = {
  initialProducts: ProductView[];
};

function formatPromotionDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AdminProductList({ initialProducts }: AdminProductListProps) {
  if (initialProducts.length === 0) {
    return (
      <div className="rounded-md border border-white/10 bg-white/[0.04] p-8 text-center">
        <h2 className="text-xl font-semibold text-white">Nenhum produto cadastrado</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          Cadastre a primeira peca real da loja para publicar a vitrine.
        </p>
        <a
          href="/admin/novo"
          className="mt-6 inline-flex rounded-md bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
        >
          Criar primeiro produto
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-white/10">
      <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr] gap-4 border-b border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 max-lg:hidden">
        <span>Produto</span>
        <span>Categoria</span>
        <span>Status</span>
        <span className="text-right">Acoes</span>
      </div>

      <div className="divide-y divide-white/10">
        {initialProducts.map((product) => {
          const promotionStatus = getPromotionStatus(product);
          const hasPromo = promotionStatus === 'active';
          const discount = getPromotionDiscount(product);
          const deleteProduct = deleteProductAction.bind(null, product.id);

          return (
            <article
              key={product.id}
              className="grid gap-4 bg-zinc-950 px-5 py-5 lg:grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr] lg:items-center"
            >
              <div className="flex gap-4">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-white/10">
                  <img
                    src={product.imageUrl}
                    alt={product.imageAlt || product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-white">{product.name}</h2>
                  <p className="mt-1 text-sm text-zinc-400">{product.slug}</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-200">
                    {hasPromo ? formatCents(product.promoPriceInCents ?? 0) : formatCents(product.priceInCents)}
                    {hasPromo ? (
                      <span className="ml-2 font-normal text-zinc-500 line-through">
                        {formatCents(product.priceInCents)}
                      </span>
                    ) : null}
                  </p>
                  {promotionStatus === 'scheduled' ? (
                    <p className="mt-1 text-xs text-sky-300">
                      Promocao agendada para {formatPromotionDate(product.promoStartsAt)}
                    </p>
                  ) : null}
                  {promotionStatus === 'ended' ? (
                    <p className="mt-1 text-xs text-zinc-500">Promocao encerrada</p>
                  ) : null}
                </div>
              </div>

              <div className="text-sm text-zinc-300">
                <p>{product.category}</p>
                <p className="mt-1 text-zinc-500">{product.colors}</p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className={product.isActive ? 'text-emerald-300' : 'text-zinc-500'}>
                  {product.isActive ? 'Publicado' : 'Oculto'}
                </span>
                {product.isFeatured ? <span className="text-rose-300">Destaque</span> : null}
                {hasPromo ? (
                  <span className="text-rose-300">
                    Promocao ativa{discount > 0 ? ` (-${discount}%)` : ''}
                  </span>
                ) : null}
                <span className={product.stock > 0 ? 'text-zinc-400' : 'text-amber-300'}>
                  {product.stock} em estoque
                </span>
              </div>

              <div className="flex gap-3 lg:justify-end">
                <a
                  href={`/admin/editar/${product.id}`}
                  className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white hover:text-zinc-950"
                >
                  Editar
                </a>
                <form action={deleteProduct}>
                  <button
                    type="submit"
                    className="rounded-md border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500 hover:text-white"
                  >
                    Remover
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
