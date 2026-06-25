import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  KeyRound,
  LogIn,
  Mail,
  ShieldCheck,
  ShoppingBag,
  UserPlus,
} from 'lucide-react';
import { isGoogleAuthConfigured } from '@/auth';
import { getCustomerSession } from '@/lib/customer-auth';
import {
  loginWithGoogleAction,
  loginWithPasswordAction,
} from '@/features/auth/actions';
import { PasswordField } from '@/features/auth/components/PasswordField';

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    error?: string;
    status?: string;
  }>;
};

function safeCallbackUrl(value?: string) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export const metadata = {
  title: 'Entrar | LunaFit',
};

export default async function CustomerLoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const callbackUrl = safeCallbackUrl(resolvedSearchParams?.callbackUrl);
  const session = await getCustomerSession();

  if (session) {
    redirect(callbackUrl);
  }

  const googleConfigured = isGoogleAuthConfigured();
  const errorMessages: Record<string, string> = {
    credentials:
      'Email ou senha incorretos. Confirme tambem se o seu email ja foi validado.',
    oauth: 'Nao foi possivel concluir o login com o Google. Tente novamente.',
    config: 'O login Google ainda precisa ser configurado no ambiente da loja.',
  };
  const statusMessages: Record<string, string> = {
    verified: 'Email confirmado. Agora voce ja pode entrar com sua senha.',
    'password-reset': 'Senha atualizada. Entre novamente com sua nova senha.',
    'account-exists':
      'Este email ja possui uma conta. Entre ou use a recuperacao de senha.',
  };
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error] ?? ''
    : '';
  const statusMessage = resolvedSearchParams?.status
    ? statusMessages[resolvedSearchParams.status] ?? ''
    : '';

  return (
    <main className="bg-zinc-100 px-5 py-14">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm lg:grid-cols-[1fr_0.85fr]">
        <div className="bg-zinc-950 p-8 text-white sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">
            Conta LunaFit
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Entre para montar seu carrinho e acompanhar pedidos.
          </h1>
          <div className="mt-8 grid gap-5 text-sm text-zinc-300">
            <div className="flex gap-3">
              <ShoppingBag aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
              <p>Seu carrinho fica salvo na sua conta em qualquer dispositivo.</p>
            </div>
            <div className="flex gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
              <p>Escolha Google ou uma senha protegida e validada pelo seu email.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center p-8 sm:p-12">
          <h2 className="text-2xl font-semibold text-zinc-950">Acessar sua conta</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Entre com seu email e senha ou continue usando sua conta Google.
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

          <form action={loginWithPasswordAction} className="mt-7 grid gap-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
                  className="w-full rounded-md border border-zinc-300 bg-white py-3 pl-11 pr-4 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </span>
            </label>
            <PasswordField
              label="Senha"
              name="password"
              autoComplete="current-password"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/esqueci-senha"
                className="text-sm font-semibold text-rose-700 hover:text-zinc-950"
              >
                Esqueci minha senha
              </Link>
              <Link
                href={`/cadastro?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 hover:text-rose-700"
              >
                <UserPlus aria-hidden="true" className="h-4 w-4" />
                Criar conta
              </Link>
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              <KeyRound aria-hidden="true" className="h-5 w-5" />
              Entrar
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs font-semibold uppercase text-zinc-400">ou</span>
            <span className="h-px flex-1 bg-zinc-200" />
          </div>

          <form action={loginWithGoogleAction}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button
              type="submit"
              disabled={!googleConfigured}
              className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-zinc-300 bg-white px-5 py-3.5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-950 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogIn aria-hidden="true" className="h-5 w-5" />
              Continuar com Google
            </button>
          </form>

          {!googleConfigured ? (
            <p className="mt-4 text-sm leading-6 text-amber-700">
              Configure <code>AUTH_GOOGLE_ID</code> e <code>AUTH_GOOGLE_SECRET</code> para
              habilitar este acesso.
            </p>
          ) : null}

          <p className="mt-6 text-xs leading-5 text-zinc-500">
            Seus dados sao usados para proteger a conta, salvar o carrinho e identificar seus
            pedidos.
          </p>
        </div>
      </section>
    </main>
  );
}
