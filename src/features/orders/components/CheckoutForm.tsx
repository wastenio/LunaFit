'use client';

import { CheckCircle2, LockKeyhole } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatCents } from '@/lib/money';
import type { CartView } from '@/features/cart/cart-data';

type CheckoutFormProps = {
  cart: CartView;
  defaultName: string;
  defaultPhone: string;
  email: string;
};

const inputClass =
  'mt-2 w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20';

export function CheckoutForm({
  cart,
  defaultName,
  defaultPhone,
  email,
}: CheckoutFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as
        | { number?: string; error?: string }
        | null;

      if (!response.ok || !data?.number) {
        setError(data?.error || 'Nao foi possivel finalizar o pedido.');
        return;
      }

      router.push(`/pedidos/${data.number}`);
      router.refresh();
    } catch {
      setError('Nao foi possivel conectar ao servidor.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-zinc-950">Contato</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-950">Nome completo</span>
              <input name="customerName" defaultValue={defaultName} required className={inputClass} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-zinc-950">Telefone com DDD</span>
              <input
                name="phone"
                type="tel"
                defaultValue={defaultPhone}
                required
                placeholder="(85) 99999-9999"
                className={inputClass}
              />
            </label>
          </div>
          <p className="mt-3 text-sm text-zinc-500">Email da conta: {email}</p>
        </section>

        <section className="border-t border-zinc-200 pt-8">
          <h2 className="text-xl font-semibold text-zinc-950">Endereco de entrega</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-950">CEP</span>
              <input name="postalCode" inputMode="numeric" required className={inputClass} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-zinc-950">Endereco</span>
              <input name="addressLine" required className={inputClass} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-zinc-950">Numero</span>
              <input name="addressNumber" required className={inputClass} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-zinc-950">Complemento</span>
              <input name="addressComplement" className={inputClass} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-zinc-950">Bairro</span>
              <input name="neighborhood" required className={inputClass} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-zinc-950">Cidade</span>
              <input name="city" required className={inputClass} />
            </label>
            <label className="block sm:max-w-32">
              <span className="text-sm font-semibold text-zinc-950">UF</span>
              <input
                name="state"
                maxLength={2}
                required
                placeholder="CE"
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <label className="block border-t border-zinc-200 pt-8">
          <span className="text-sm font-semibold text-zinc-950">Observacoes</span>
          <textarea
            name="notes"
            className={`${inputClass} min-h-28`}
            placeholder="Referencia de entrega ou outra informacao importante."
          />
        </label>
      </div>

      <aside className="h-fit border border-zinc-200 bg-zinc-50 p-6 lg:sticky lg:top-32">
        <h2 className="text-lg font-semibold text-zinc-950">Seu pedido</h2>
        <div className="mt-5 divide-y divide-zinc-200">
          {cart.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 py-4 text-sm">
              <div>
                <p className="font-semibold text-zinc-950">
                  {item.quantity}x {item.product.name}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.size} · {item.color}
                </p>
              </div>
              <span className="shrink-0 text-zinc-700">{formatCents(item.totalInCents)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-zinc-300 pt-4">
          <span className="font-semibold text-zinc-950">Total dos produtos</span>
          <span className="text-lg font-semibold text-zinc-950">
            {formatCents(cart.subtotalInCents)}
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Frete e pagamento serao combinados apos o envio do pedido.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-rose-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            'Finalizando...'
          ) : (
            <>
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
              Confirmar pedido
            </>
          )}
        </button>
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <LockKeyhole aria-hidden="true" className="h-4 w-4" />
          Dados protegidos pela sua sessao.
        </p>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </aside>
    </form>
  );
}
