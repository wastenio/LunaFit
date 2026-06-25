import Link from 'next/link';
import { CheckCircle2, MailCheck, RotateCw } from 'lucide-react';
import {
  requestEmailVerificationAction,
  verifyCustomerEmailAction,
} from '@/features/auth/actions';

type VerifyEmailPageProps = {
  searchParams?: Promise<{
    token?: string;
    callbackUrl?: string;
    status?: string;
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: 'Este link e invalido ou expirou. Solicite uma nova confirmacao.',
  'email-config': 'O envio de emails ainda precisa ser configurado pela loja.',
  'email-send': 'Nao foi possivel enviar o email agora. Tente novamente.',
};

export const metadata = {
  title: 'Confirmar email | LunaFit',
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams?.token ?? '';
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error] ?? ''
    : '';
  const statusMessage =
    resolvedSearchParams?.status === 'sent'
      ? 'Enviamos um link de confirmacao. Verifique sua caixa de entrada e a pasta de spam.'
      : resolvedSearchParams?.status === 'resent'
        ? 'Se o email estiver aguardando confirmacao, um novo link sera enviado.'
        : '';

  return (
    <main className="bg-zinc-100 px-5 py-14">
      <section className="mx-auto max-w-xl rounded-md border border-zinc-200 bg-white p-8 shadow-sm sm:p-12">
        <MailCheck aria-hidden="true" className="h-10 w-10 text-rose-600" />
        <h1 className="mt-5 text-3xl font-semibold text-zinc-950">Confirmar email</h1>

        {token ? (
          <>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Confirme seu email para ativar o acesso por senha na LunaFit.
            </p>
            <form action={verifyCustomerEmailAction} className="mt-7">
              <input type="hidden" name="token" value={token} />
              <input
                type="hidden"
                name="callbackUrl"
                value={resolvedSearchParams?.callbackUrl ?? '/'}
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-rose-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                Confirmar meu email
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Informe seu email caso precise receber um novo link de confirmacao.
            </p>
            {statusMessage ? (
              <p className="mt-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {statusMessage}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}
            <form action={requestEmailVerificationAction} className="mt-7 grid gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-zinc-800">Email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-2 w-full rounded-md border border-zinc-300 px-4 py-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                <RotateCw aria-hidden="true" className="h-4 w-4" />
                Reenviar confirmacao
              </button>
            </form>
          </>
        )}

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
