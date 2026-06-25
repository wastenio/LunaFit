import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/features/products/components/ProductForm';
import { getProductForAdmin } from '@/features/products/product-data';

export const dynamic = 'force-dynamic';

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata = {
  title: 'Editar produto | LunaFit',
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const product = await getProductForAdmin(id);

  if (!product) {
    notFound();
  }

  return (
    <section>
      <Link href="/admin" className="text-sm font-semibold text-rose-300 hover:text-white">
        Voltar para produtos
      </Link>
      <div className="mt-4 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-300">Edicao</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{product.name}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Atualize preco, estoque, imagem e status de publicacao desta peca.
        </p>
      </div>

      <div className="mt-8 rounded-md border border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <ProductForm key={product.id} product={product} />
      </div>
    </section>
  );
}
