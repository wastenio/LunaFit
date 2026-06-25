'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatCents } from '@/lib/money';
import type { CartView as CartViewData } from '../cart-data';

type CartViewProps = {
  initialCart: CartViewData;
};

export function CartView({ initialCart }: CartViewProps) {
  const router = useRouter();
  const [cart, setCart] = useState(initialCart);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function mutateItem(id: number, method: 'PATCH' | 'DELETE', quantity?: number) {
    setPendingId(id);
    setError('');

    try {
      const response = await fetch(`/api/cart/${id}`, {
        method,
        headers: method === 'PATCH' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'PATCH' ? JSON.stringify({ quantity }) : undefined,
      });
      const data = (await response.json().catch(() => null)) as
        | (CartViewData & { error?: string })
        | null;

      if (!response.ok || !data) {
        setError(data?.error || 'Nao foi possivel atualizar o carrinho.');
        return;
      }

      setCart(data);
      router.refresh();
    } catch {
      setError('Nao foi possivel conectar ao carrinho.');
    } finally {
      setPendingId(null);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="border border-dashed border-zinc-300 bg-zinc-50 px-6 py-14 text-center">
        <ShoppingBag aria-hidden="true" className="mx-auto h-9 w-9 text-zinc-400" />
        <h2 className="mt-4 text-xl font-semibold text-zinc-950">Seu carrinho esta vazio</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
          Explore o catalogo e escolha as pecas, tamanhos e cores que combinam com seu ritmo.
        </p>
        <Link
          href="/produtos"
          className="mt-6 inline-flex rounded-md bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="divide-y divide-zinc-200 border-y border-zinc-200">
        {cart.items.map((item) => {
          const isPending = pendingId === item.id;

          return (
            <article key={item.id} className="grid gap-5 py-6 sm:grid-cols-[120px_1fr_auto]">
              <Link
                href={`/produtos/${item.product.slug}`}
                className="relative aspect-[4/5] overflow-hidden bg-zinc-100"
              >
                <Image
                  src={item.product.imageUrl}
                  alt={item.product.imageAlt || item.product.name}
                  fill
                  sizes="120px"
                  className="object-cover"
                  unoptimized
                />
              </Link>

              <div>
                <Link
                  href={`/produtos/${item.product.slug}`}
                  className="font-semibold text-zinc-950 hover:text-rose-700"
                >
                  {item.product.name}
                </Link>
                <p className="mt-2 text-sm text-zinc-500">
                  Tamanho {item.size} · Cor {item.color}
                </p>
                <p className="mt-3 text-sm font-semibold text-zinc-950">
                  {formatCents(item.unitPriceInCents)}
                </p>
                {!item.product.isActive ? (
                  <p className="mt-2 text-sm text-red-600">Produto indisponivel para finalizar.</p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <div className="inline-flex h-10 items-center border border-zinc-300">
                  <button
                    type="button"
                    disabled={isPending || item.quantity <= 1}
                    onClick={() => mutateItem(item.id, 'PATCH', item.quantity - 1)}
                    className="grid h-full w-9 place-items-center text-zinc-700 hover:bg-zinc-100 disabled:text-zinc-300"
                    aria-label={`Diminuir quantidade de ${item.product.name}`}
                  >
                    <Minus aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <span className="min-w-10 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    disabled={isPending || item.quantity >= item.product.stock}
                    onClick={() => mutateItem(item.id, 'PATCH', item.quantity + 1)}
                    className="grid h-full w-9 place-items-center text-zinc-700 hover:bg-zinc-100 disabled:text-zinc-300"
                    aria-label={`Aumentar quantidade de ${item.product.name}`}
                  >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => mutateItem(item.id, 'DELETE')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Remover
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <aside className="h-fit border border-zinc-200 bg-zinc-50 p-6">
        <h2 className="text-lg font-semibold text-zinc-950">Resumo</h2>
        <div className="mt-5 flex items-center justify-between text-sm text-zinc-600">
          <span>
            {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'itens'}
          </span>
          <span>{formatCents(cart.subtotalInCents)}</span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4">
          <span className="font-semibold text-zinc-950">Subtotal</span>
          <span className="text-lg font-semibold text-zinc-950">
            {formatCents(cart.subtotalInCents)}
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Entrega e forma de pagamento serao confirmadas no atendimento do pedido.
        </p>
        <Link
          href="/checkout"
          className="mt-6 inline-flex w-full justify-center rounded-md bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
        >
          Finalizar pedido
        </Link>
        <Link
          href="/produtos"
          className="mt-3 inline-flex w-full justify-center px-5 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
        >
          Continuar comprando
        </Link>
      </aside>

      {error ? <p className="text-sm text-red-600 lg:col-span-2">{error}</p> : null}
    </div>
  );
}
