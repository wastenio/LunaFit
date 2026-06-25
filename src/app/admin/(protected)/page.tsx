import { AdminProductList } from '@/features/products/components/AdminProductList';
import { listProductsForAdmin } from '@/features/products/product-data';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin | LunaFit',
};

export default async function AdminPage() {
  const products = await listProductsForAdmin();

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-300">
            Administracao
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Painel de produtos</h1>
        </div>
        <p className="text-sm text-zinc-400">
          {products.length} {products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}
        </p>
      </div>

      <div className="mt-8">
        <AdminProductList initialProducts={products} />
      </div>
    </section>
  );
}
