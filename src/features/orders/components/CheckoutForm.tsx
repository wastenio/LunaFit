'use client';

import { CheckCircle2, Clock3, LockKeyhole, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatCents } from '@/lib/money';
import type { CartView } from '@/features/cart/cart-data';
import type { ShippingQuoteOption } from '@/features/shipping/shipping-types';

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
  const [postalCode, setPostalCode] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [shippingOptions, setShippingOptions] = useState<ShippingQuoteOption[]>([]);
  const [selectedShippingServiceId, setSelectedShippingServiceId] = useState('');
  const selectedShippingOption =
    shippingOptions.find((option) => option.serviceId === selectedShippingServiceId) ?? null;
  const totalInCents =
    cart.subtotalInCents + (selectedShippingOption?.priceInCents ?? 0);

  function handlePostalCodeChange(value: string) {
    setPostalCode(value);
    setQuoteError('');
    setShippingOptions([]);
    setSelectedShippingServiceId('');
  }

  async function handleQuoteShipping() {
    const normalizedPostalCode = postalCode.replace(/\D/g, '');

    setQuoteError('');

    if (normalizedPostalCode.length !== 8) {
      setQuoteError('Informe um CEP com 8 digitos.');
      return;
    }

    setQuoteLoading(true);

    try {
      const response = await fetch('/api/shipping/quote', {
        body: JSON.stringify({ postalCode: normalizedPostalCode }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = (await response.json().catch(() => null)) as
        | { options?: ShippingQuoteOption[]; error?: string }
        | null;

      if (!response.ok || !data?.options?.length) {
        setQuoteError(data?.error || 'Nao foi possivel calcular o frete.');
        return;
      }

      setShippingOptions(data.options);
      setSelectedShippingServiceId(data.options[0].serviceId);
    } catch {
      setQuoteError('Nao foi possivel conectar ao calculo de frete.');
    } finally {
      setQuoteLoading(false);
    }
  }

  function getDeliveryLabel(option: ShippingQuoteOption) {
    if (option.deliveryMaxDays === null) {
      return 'Prazo a confirmar';
    }

    const minDays = option.deliveryMinDays ?? option.deliveryMaxDays;
    const range =
      minDays === option.deliveryMaxDays
        ? String(option.deliveryMaxDays)
        : `${minDays} a ${option.deliveryMaxDays}`;

    return `${range} dias uteis`;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    if (!selectedShippingOption) {
      setError('Calcule e selecione uma opcao de frete antes de finalizar.');
      setSaving(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as
        | { checkoutUrl?: string; number?: string; error?: string }
        | null;

      if (!response.ok || !data?.number) {
        setError(data?.error || 'Nao foi possivel finalizar o pedido.');
        return;
      }

      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }

      router.push(`/pedidos/${data.number}`);
    } catch {
      setError('Nao foi possivel conectar ao servidor.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <input
        name="shippingServiceId"
        type="hidden"
        value={selectedShippingServiceId}
      />
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
              <input
                name="postalCode"
                inputMode="numeric"
                required
                value={postalCode}
                onChange={(event) => handlePostalCodeChange(event.target.value)}
                className={inputClass}
              />
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

          <section className="mt-6 border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-rose-600">
                  <Truck aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-zinc-950">Frete</h3>
                  <p className="text-sm text-zinc-500">Correios e transportadoras disponiveis.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuoteShipping}
                disabled={quoteLoading}
                className="inline-flex justify-center rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {quoteLoading ? 'Calculando...' : 'Calcular frete'}
              </button>
            </div>

            {quoteError ? <p className="mt-4 text-sm text-red-600">{quoteError}</p> : null}

            {shippingOptions.length > 0 ? (
              <div className="mt-5 divide-y divide-zinc-200 border-y border-zinc-200">
                {shippingOptions.map((option) => (
                  <label
                    key={option.serviceId}
                    className="grid cursor-pointer grid-cols-[20px_1fr_auto] gap-3 py-4 text-sm"
                  >
                    <input
                      type="radio"
                      name="shippingOption"
                      checked={selectedShippingServiceId === option.serviceId}
                      onChange={() => setSelectedShippingServiceId(option.serviceId)}
                      className="mt-1 h-4 w-4 accent-rose-600"
                    />
                    <span>
                      <span className="block font-semibold text-zinc-950">
                        {option.carrierName} - {option.serviceName}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                        <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                        {getDeliveryLabel(option)}
                      </span>
                    </span>
                    <span className="font-semibold text-zinc-950">
                      {formatCents(option.priceInCents)}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}
          </section>
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
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-zinc-600">Frete</span>
          <span className="font-semibold text-zinc-950">
            {selectedShippingOption ? formatCents(selectedShippingOption.priceInCents) : 'Calcule'}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-zinc-300 pt-4">
          <span className="font-semibold text-zinc-950">Total</span>
          <span className="text-xl font-semibold text-zinc-950">
            {formatCents(totalInCents)}
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          O pagamento sera realizado no ambiente seguro do Mercado Pago com produtos e frete.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-rose-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            'Abrindo pagamento...'
          ) : (
            <>
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
              Ir para pagamento
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
