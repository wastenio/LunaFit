import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { resetCustomerPasswordAction } from '@/features/auth/actions';
import { PasswordField } from '@/features/auth/components/PasswordField';

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: 'Este link e invalido ou expirou. Solicite uma nova recuperacao.',
  password:
    'A senha deve ter pelo menos 8 caracteres, com maiuscula, minuscula e numero.',
  confirmation: 'As senhas informadas nao sao iguais.',
};

export const metadata = {
  title: 'Criar nova senha | LunaFit',
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams?.token ?? '';
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error] ?? ''
    : '';

  return (
    <main className="bg-zinc-100 px-5 py-14">
      <section className="mx-auto max-w-xl rounded-md border border-zinc-200 bg-white p-8 shadow-sm sm:p-12">
        <LockKeyhole aria-hidden="true" className="h-10 w-10 text-rose-600" />
        <h1 className="mt-5 text-3xl font-semibold text-zinc-950">Criar nova senha</h1>

        {!token || resolvedSearchParams?.error === 'invalid' ? (
          <>
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              {errorMessage || 'O link de recuperacao nao foi informado.'}
            </p>
            <Link
              href="/esqueci-senha"
              className="mt-6 inline-flex rounded-md bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Solicitar novo link
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Defina uma senha forte para proteger sua conta.
            </p>
            {errorMessage ? (
              <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}
            <form action={resetCustomerPasswordAction} className="mt-7 grid gap-4">
              <input type="hidden" name="token" value={token} />
              <PasswordField
                label="Nova senha"
                name="password"
                autoComplete="new-password"
                hint="Use 8 ou mais caracteres, com maiuscula, minuscula e numero."
              />
              <PasswordField
                label="Confirmar nova senha"
                name="passwordConfirmation"
                autoComplete="new-password"
              />
              <button
                type="submit"
                className="rounded-md bg-rose-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Atualizar senha
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
