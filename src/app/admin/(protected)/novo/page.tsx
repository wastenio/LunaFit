import Link from 'next/link';
import { ProductForm } from '@/features/products/components/ProductForm';

export const metadata = {
  title: 'Novo produto | LunaFit',
};

export default function NewProductPage() {
  return (
    <section>
      <Link href="/admin" className="text-sm font-semibold text-rose-300 hover:text-white">
        Voltar para produtos
      </Link>
      <div className="mt-4 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-300">Cadastro</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Novo produto</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Preencha com informacoes reais da peca. Produtos publicados aparecem automaticamente na vitrine.
        </p>
      </div>

      <div className="mt-8 rounded-md border border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <ProductForm />
      </div>
    </section>
  );
}
