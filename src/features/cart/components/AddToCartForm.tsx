'use client';

import Link from 'next/link';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type AddToCartFormProps = {
  productId: number;
  productSlug: string;
  sizes: string[];
  colors: string[];
  stock: number;
  isAuthenticated: boolean;
};

export function AddToCartForm({
  productId,
  productSlug,
  sizes,
  colors,
  stock,
  isAuthenticated,
}: AddToCartFormProps) {
  const router = useRouter();
  const [size, setSize] = useState(sizes[0] ?? '');
  const [color, setColor] = useState(colors[0] ?? '');
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthenticated) {
    return (
      <div className="mt-8">
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/produtos/${productSlug}`)}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-rose-700 sm:w-auto"
        >
          <ShoppingBag aria-hidden="true" className="h-5 w-5" />
          Entrar para comprar
        </Link>
        <p className="mt-3 text-sm text-zinc-500">
          O catalogo e publico. O login e solicitado apenas para carrinho e pedidos.
        </p>
      </div>
    );
  }

  async function addToCart() {
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          size,
          color,
          quantity,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(data?.error || 'Nao foi possivel adicionar ao carrinho.');
        return;
      }

      router.push('/carrinho');
      router.refresh();
    } catch {
      setError('Nao foi possivel conectar ao carrinho.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 border-t border-zinc-200 pt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-zinc-950">Tamanho</span>
          <select
            value={size}
            onChange={(event) => setSize(event.target.value)}
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          >
            {sizes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-950">Cor</span>
          <select
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          >
            {colors.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="text-sm font-semibold text-zinc-950">Quantidade</span>
          <div className="mt-2 inline-flex h-12 items-center border border-zinc-300 bg-white">
            <button
              type="button"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={quantity <= 1}
              className="grid h-full w-11 place-items-center text-zinc-700 transition hover:bg-zinc-100 disabled:text-zinc-300"
              aria-label="Diminuir quantidade"
            >
              <Minus aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center text-sm font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((current) => Math.min(stock, current + 1))}
              disabled={quantity >= stock}
              className="grid h-full w-11 place-items-center text-zinc-700 transition hover:bg-zinc-100 disabled:text-zinc-300"
              aria-label="Aumentar quantidade"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={addToCart}
          disabled={saving || stock <= 0 || !size || !color}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingBag aria-hidden="true" className="h-5 w-5" />
          {saving ? 'Adicionando...' : stock > 0 ? 'Adicionar ao carrinho' : 'Produto esgotado'}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
