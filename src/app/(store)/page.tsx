import Link from 'next/link';
import { getStoreConfig } from '@/config/store';
import { getCustomerSession } from '@/lib/customer-auth';
import {
  HomeHeroCarousel,
  type HomeHeroProduct,
} from '@/features/home/components/HomeHeroCarousel';
import { ProductRail } from '@/features/home/components/ProductRail';
import { ProductCard } from '@/features/products/components/ProductCard';
import { ProductEmptyState } from '@/features/products/components/ProductEmptyState';
import {
  listActivePromotions,
  listFeaturedProducts,
  listLatestProducts,
} from '@/features/products/product-data';

export const dynamic = 'force-dynamic';

const storeBenefits = [
  {
    title: 'Movimento sem limites',
    description: 'Modelagens pensadas para acompanhar treino e rotina.',
  },
  {
    title: 'Curadoria feminina',
    description: 'Pecas selecionadas para unir desempenho e estilo.',
  },
  {
    title: 'Estoque atualizado',
    description: 'Disponibilidade controlada diretamente pelo painel.',
  },
  {
    title: 'Atendimento direto',
    description: 'Converse com a loja antes de finalizar sua escolha.',
  },
];

function serializeHeroProduct(
  product: Awaited<ReturnType<typeof listLatestProducts>>[number]
): HomeHeroProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category,
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    priceInCents: product.priceInCents,
    promoPriceInCents: product.promoPriceInCents,
    promoStartsAt: product.promoStartsAt?.toISOString() ?? null,
    promoEndsAt: product.promoEndsAt?.toISOString() ?? null,
  };
}

export default async function HomePage() {
  const store = getStoreConfig();
  const [featuredProducts, latestProducts, promotionProducts, session] = await Promise.all([
    listFeaturedProducts(5),
    listLatestProducts(12),
    listActivePromotions(8),
    getCustomerSession(),
  ]);
  const heroProducts =
    featuredProducts.length > 0 ? featuredProducts : latestProducts.slice(0, 4);

  return (
    <main className="overflow-hidden">
      <HomeHeroCarousel
        storeName={store.name}
        storeDescription={store.description}
        products={heroProducts.map(serializeHeroProduct)}
      />

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-zinc-200 px-5 sm:grid-cols-4 sm:divide-y-0">
          {storeBenefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className={`px-4 py-6 first:pl-0 last:pr-0 ${
                index === 2 ? 'border-l-0 sm:border-l' : ''
              }`}
            >
              <p className="text-sm font-semibold text-zinc-950">{benefit.title}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="novidades" className="mx-auto max-w-6xl scroll-mt-28 px-5 py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
              Novidades
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-zinc-950 sm:text-4xl">
              Seu proximo look de treino
            </h2>
          </div>
          <Link href="/produtos" className="text-sm font-semibold text-rose-700 hover:text-zinc-950">
            Ver todos os produtos
          </Link>
        </div>

        {latestProducts.length > 0 ? (
          <div className="mt-3">
            <ProductRail label="Novidades da LunaFit">
              {latestProducts.map((product) => (
                <div
                  key={product.id}
                  className="w-[78vw] max-w-[310px] shrink-0 snap-start sm:w-[42vw] lg:w-[calc((100%_-_2.5rem)/3)]"
                >
                  <ProductCard product={product} isAuthenticated={Boolean(session)} />
                </div>
              ))}
            </ProductRail>
          </div>
        ) : (
          <div className="mt-8">
            <ProductEmptyState
              title="A nova colecao esta chegando"
              description="Os produtos reais cadastrados no painel aparecerao automaticamente neste carrossel."
            />
          </div>
        )}
      </section>

      {promotionProducts.length > 0 ? (
        <section id="promocoes" className="scroll-mt-28 bg-zinc-950 text-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">
                  Promocoes ativas
                </p>
                <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
                  Mais movimento por menos
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                  Ofertas validas agora, atualizadas automaticamente pelo painel da loja.
                </p>
              </div>
              <Link href="/produtos" className="text-sm font-semibold text-rose-300 hover:text-white">
                Explorar ofertas
              </Link>
            </div>

            <div className="mt-3">
              <ProductRail label="Produtos em promocao" dark>
                {promotionProducts.map((product) => (
                  <div
                    key={product.id}
                    className="w-[78vw] max-w-[310px] shrink-0 snap-start sm:w-[42vw] lg:w-[calc((100%_-_2.5rem)/3)]"
                  >
                    <ProductCard product={product} isAuthenticated={Boolean(session)} />
                  </div>
                ))}
              </ProductRail>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-y border-zinc-200 bg-zinc-100">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
              LunaFit em movimento
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-zinc-950 sm:text-4xl">
              Fitness nao termina quando o treino acaba.
            </h2>
          </div>
          <div>
            <p className="text-base leading-8 text-zinc-600">
              Nossa curadoria conecta conforto, confianca e uma estetica atual para mulheres que
              querem se sentir bem em cada parte do dia. Escolha sua peca, confira tamanhos e cores
              e fale diretamente com a loja.
            </p>
            <Link
              href="/contato"
              className="mt-6 inline-flex rounded-md border border-zinc-950 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-950 hover:text-white"
            >
              Receber atendimento
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-rose-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-rose-100">Pronta para o proximo movimento?</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Encontre a peca que acompanha seu ritmo.
            </h2>
          </div>
          <Link
            href="/produtos"
            className="inline-flex justify-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-zinc-950 hover:text-white"
          >
            Ver colecao
          </Link>
        </div>
      </section>
    </main>
  );
}
