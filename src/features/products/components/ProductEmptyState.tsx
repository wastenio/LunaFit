import Link from 'next/link';

type ProductEmptyStateProps = {
  actionHref?: string;
  actionLabel?: string;
  title?: string;
  description?: string;
};

export function ProductEmptyState({
  actionHref,
  actionLabel = 'Abrir painel',
  title = 'Nenhuma peca cadastrada ainda',
  description = 'Cadastre produtos reais no painel administrativo para publicar a vitrine.',
}: ProductEmptyStateProps) {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
      <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">{description}</p>
      {actionHref ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex rounded-md bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
