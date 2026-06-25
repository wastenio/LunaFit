import Link from 'next/link';
import { KeyRound, Mail } from 'lucide-react';
import { requestPasswordResetAction } from '@/features/auth/actions';

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    status?: string;
    error?: string;
  }>;
};

export const metadata = {
  title: 'Recuperar acesso | LunaFit',
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const resolvedSearchParams = await searchParams;
  const errorMessage =
    resolvedSearchParams?.error === 'email-config'
      ? 'O envio de emails ainda precisa ser configurado pela loja.'
      : resolvedSearchParams?.error === 'email-send'
        ? 'Nao foi possivel enviar o email agora. Tente novamente.'
        : '';

  return (
    <main className="bg-zinc-100 px-5 py-14">
      <section className="mx-auto max-w-xl rounded-md border border-zinc-200 bg-white p-8 shadow-sm sm:p-12">
        <KeyRound aria-hidden="true" className="h-10 w-10 text-rose-600" />
        <h1 className="mt-5 text-3xl font-semibold text-zinc-950">Recuperar acesso</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Informe seu email. Se houver uma conta correspondente, enviaremos um
          link valido por 30 minutos.
        </p>

        {resolvedSearchParams?.status === 'sent' ? (
          <p className="mt-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Se o email estiver cadastrado, as instrucoes foram enviadas.
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <form action={requestPasswordResetAction} className="mt-7 grid gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-zinc-800">Email</span>
            <span className="relative mt-2 block">
              <Mail
                aria-hidden="true"
                className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              />
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-md border border-zinc-300 py-3 pl-11 pr-4 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </span>
          </label>
          <button
            type="submit"
            className="rounded-md bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Enviar link de recuperacao
          </button>
        </form>

        <Link
          href="/login"
          className="mt-6 inline-flex text-sm font-semibold text-rose-700 hover:text-zinc-950"
        >
          Voltar para o login
        </Link>
      </section>
    </main>
  );
}
