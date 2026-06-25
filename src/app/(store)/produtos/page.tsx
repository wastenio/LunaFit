import { ProductCard } from '@/features/products/components/ProductCard';
import { ProductEmptyState } from '@/features/products/components/ProductEmptyState';
import { listPublicProducts } from '@/features/products/product-data';
import { getCustomerSession } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Produtos | LunaFit',
};

export default async function ProductsPage() {
  const [products, session] = await Promise.all([
    listPublicProducts(),
    getCustomerSession(),
  ]);

  return (
    <main>
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-600">Produtos</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">Vitrine LunaFit</h1>
          <p className="mt-4 text-base leading-7 text-zinc-600">
            Navegue pelas pecas cadastradas na loja. Os detalhes de tamanho, cor e estoque sao
            atualizados pelo painel administrativo.
          </p>
        </div>

        {products.length > 0 ? (
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isAuthenticated={Boolean(session)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-9">
            <ProductEmptyState
              title="Nenhum produto publicado"
              description="A loja ainda nao possui pecas publicadas. Volte em breve para ver a colecao."
            />
          </div>
        )}
      </section>
    </main>
  );
}
