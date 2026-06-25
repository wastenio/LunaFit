import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 text-zinc-950">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-600">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Pagina nao encontrada</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          O endereco acessado nao existe ou o produto nao esta publicado.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          Voltar para a loja
        </Link>
      </div>
    </main>
  );
}
