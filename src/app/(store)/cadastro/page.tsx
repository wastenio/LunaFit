import Link from 'next/link';
import { MailCheck, UserPlus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer-auth';
import { registerCustomerAction } from '@/features/auth/actions';
import { PasswordField } from '@/features/auth/components/PasswordField';

type RegisterPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
};

function safeCallbackUrl(value?: string) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

const errorMessages: Record<string, string> = {
  name: 'Informe seu nome completo.',
  email: 'Informe um email valido.',
  password:
    'A senha deve ter pelo menos 8 caracteres, com maiuscula, minuscula e numero.',
  confirmation: 'As senhas informadas nao sao iguais.',
  'email-config':
    'O envio de emails ainda precisa ser configurado pela loja.',
  'email-send':
    'Nao foi possivel enviar a confirmacao agora. Tente novamente em instantes.',
};

export const metadata = {
  title: 'Criar conta | LunaFit',
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const resolvedSearchParams = await searchParams;
  const callbackUrl = safeCallbackUrl(resolvedSearchParams?.callbackUrl);
  const session = await getCustomerSession();

  if (session) {
    redirect(callbackUrl);
  }

  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error] ?? ''
    : '';

  return (
    <main className="bg-zinc-100 px-5 py-14">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm lg:grid-cols-[0.8fr_1fr]">
        <div className="bg-zinc-950 p-8 text-white sm:p-12">
          <MailCheck aria-hidden="true" className="h-9 w-9 text-rose-300" />
          <h1 className="mt-6 text-3xl font-semibold leading-tight">
            Crie sua conta LunaFit.
          </h1>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Enviaremos uma confirmacao para garantir que o email pertence a voce.
            Depois disso, seu carrinho e seus pedidos ficam acessiveis em qualquer
            dispositivo.
          </p>
        </div>

        <div className="p-8 sm:p-12">
          <h2 className="text-2xl font-semibold text-zinc-950">Novo cadastro</h2>
          <p className="mt-2 text-sm text-zinc-600">Preencha os dados abaixo para continuar.</p>

          {errorMessage ? (
            <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <form action={registerCustomerAction} className="mt-7 grid gap-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <label className="block">
              <span className="text-sm font-semibold text-zinc-800">Nome completo</span>
              <input
                name="name"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-zinc-800">Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </label>
            <PasswordField
              label="Senha"
              name="password"
              autoComplete="new-password"
              hint="Use 8 ou mais caracteres, com maiuscula, minuscula e numero."
            />
            <PasswordField
              label="Confirmar senha"
              name="passwordConfirmation"
              autoComplete="new-password"
            />
            <button
              type="submit"
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              <UserPlus aria-hidden="true" className="h-5 w-5" />
              Criar conta
            </button>
          </form>

          <p className="mt-6 text-sm text-zinc-600">
            Ja possui cadastro?{' '}
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="font-semibold text-rose-700 hover:text-zinc-950"
            >
              Entrar
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
