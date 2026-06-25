import Link from 'next/link';
import { loginAdminAction } from '@/features/admin/actions';

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  if (error === 'config') {
    return 'Configure ADMIN_PASSWORD e AUTH_SECRET no arquivo .env.local antes de acessar o painel.';
  }

  if (error === 'invalid') {
    return 'Senha invalida.';
  }

  return '';
}

export const metadata = {
  title: 'Entrar no admin | LunaFit',
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const errorMessage = getErrorMessage(resolvedSearchParams?.error);

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <Link href="/" className="text-sm font-semibold text-rose-300 hover:text-white">
          Voltar para loja
        </Link>
        <div className="mt-6 rounded-md border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-300">Admin</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Acessar painel</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Entre com a senha administrativa configurada no ambiente da aplicacao.
          </p>

          <form action={loginAdminAction} className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-200">Senha</span>
              <input
                name="password"
                type="password"
                required
                className="mt-2 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              Entrar
            </button>
          </form>

          {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}
        </div>
      </div>
    </main>
  );
}
