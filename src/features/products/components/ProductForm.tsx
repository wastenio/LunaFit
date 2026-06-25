/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { centsToInputValue } from '@/lib/money';
import type { ProductView } from '../product-data';
import { slugify } from '../product-utils';

type ProductFormProps = {
  product?: ProductView;
};

type Status =
  | {
      type: 'idle';
      message: string;
    }
  | {
      type: 'error' | 'success';
      message: string;
    };

type UploadResponse = {
  error?: string;
  imageUrl?: string;
};

function normalizeMoneyDisplay(value: string) {
  const rawValue = value.replace(/[R$\s]/g, '').trim();

  if (!rawValue) {
    return '';
  }

  const normalized = rawValue.includes(',')
    ? rawValue.replace(/\./g, '').replace(',', '.')
    : rawValue;
  const parsedValue = Number(normalized);

  if (!Number.isFinite(parsedValue)) {
    return value.trim();
  }

  return parsedValue.toFixed(2).replace('.', ',');
}

function parseMoneyInput(value: string) {
  const rawValue = value.replace(/[R$\s]/g, '').trim();

  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.includes(',')
    ? rawValue.replace(/\./g, '').replace(',', '.')
    : rawValue;
  const parsedValue = Number(normalized);

  return Number.isFinite(parsedValue) ? Math.round(parsedValue * 100) : null;
}

function dateToLocalInput(value?: Date | string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function localDateToIso(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(product?.slug));
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(centsToInputValue(product?.priceInCents));
  const [promoPrice, setPromoPrice] = useState(centsToInputValue(product?.promoPriceInCents));
  const [promotionEnabled, setPromotionEnabled] = useState(
    typeof product?.promoPriceInCents === 'number'
  );
  const [promoStartsAt, setPromoStartsAt] = useState(() =>
    dateToLocalInput(product?.promoStartsAt)
  );
  const [promoEndsAt, setPromoEndsAt] = useState(() =>
    dateToLocalInput(product?.promoEndsAt)
  );
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(product?.imageUrl ?? '');
  const [imageAlt, setImageAlt] = useState(product?.imageAlt ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [sizes, setSizes] = useState(product?.sizes ?? '');
  const [colors, setColors] = useState(product?.colors ?? '');
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>({ type: 'idle', message: '' });

  const isEdit = Boolean(product);
  const priceInCents = parseMoneyInput(price);
  const promoPriceInCents = parseMoneyInput(promoPrice);
  const promotionDiscount =
    priceInCents &&
    promoPriceInCents &&
    promoPriceInCents > 0 &&
    promoPriceInCents < priceInCents
      ? Math.round((1 - promoPriceInCents / priceInCents) * 100)
      : 0;

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  function handleNameChange(value: string) {
    setName(value);

    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleImageChange(file?: File) {
    const nextFile = file ?? null;

    setImageFile(nextFile);
    setImagePreview(nextFile ? URL.createObjectURL(nextFile) : imageUrl);
  }

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/uploads/product-image', {
      body: formData,
      method: 'POST',
    });
    const data = (await response.json().catch(() => null)) as UploadResponse | null;

    if (!response.ok || !data?.imageUrl) {
      throw new Error(data?.error || 'Nao foi possivel anexar a imagem.');
    }

    return data.imageUrl;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: 'idle', message: '' });

    try {
      let uploadedImageUrl = imageUrl;

      if (imageFile) {
        setStatus({ type: 'idle', message: 'Enviando imagem...' });
        uploadedImageUrl = await uploadImage(imageFile);
        setImageUrl(uploadedImageUrl);
      }

      if (!uploadedImageUrl) {
        setStatus({ type: 'error', message: 'Anexe uma imagem do produto.' });
        return;
      }

      setStatus({ type: 'idle', message: 'Salvando produto...' });

      const response = await fetch(isEdit ? `/api/products/${product?.id}` : '/api/products', {
        body: JSON.stringify({
          name,
          slug,
          description,
          price,
          promoPrice: promotionEnabled ? promoPrice : '',
          promoStartsAt: promotionEnabled ? localDateToIso(promoStartsAt) : null,
          promoEndsAt: promotionEnabled ? localDateToIso(promoEndsAt) : null,
          imageUrl: uploadedImageUrl,
          imageAlt,
          category,
          sizes,
          colors,
          stock,
          isActive,
          isFeatured,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: isEdit ? 'PUT' : 'POST',
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setStatus({
          type: 'error',
          message: data?.error || 'Nao foi possivel salvar o produto. Revise os campos e tente novamente.',
        });
        return;
      }

      setStatus({
        type: 'success',
        message: isEdit ? 'Produto atualizado.' : 'Produto criado.',
      });
      router.push('/admin');
      router.refresh();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Nao foi possivel salvar o produto.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-zinc-200">Nome do produto</span>
          <input
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            required
            className="mt-2 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-200">Slug</span>
          <input
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            required
            className="mt-2 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-zinc-200">Descricao</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
          className="mt-2 min-h-32 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
        />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-zinc-200">Preco</span>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            onBlur={(event) => setPrice(normalizeMoneyDisplay(event.target.value))}
            required
            placeholder="0,00"
            className="mt-2 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-200">Estoque</span>
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            required
            className="mt-2 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />
        </label>
      </div>

      <section className="rounded-md border border-rose-400/20 bg-rose-500/[0.06] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Promocao</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
              Ative para aplicar um preco menor agora ou agendar a oferta para um periodo.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-zinc-100">
            <input
              type="checkbox"
              checked={promotionEnabled}
              onChange={(event) => setPromotionEnabled(event.target.checked)}
              className="h-5 w-5 rounded border-zinc-400 text-rose-600 focus:ring-rose-500"
            />
            Produto em promocao
          </label>
        </div>

        {promotionEnabled ? (
          <div className="mt-5 grid gap-5 border-t border-white/10 pt-5 md:grid-cols-3">
            <label className="block">
              <span className="flex items-center justify-between gap-3 text-sm font-semibold text-zinc-200">
                Preco promocional
                {promotionDiscount > 0 ? (
                  <span className="rounded bg-rose-500 px-2 py-1 text-xs text-white">
                    {promotionDiscount}% de desconto
                  </span>
                ) : null}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={promoPrice}
                onChange={(event) => setPromoPrice(event.target.value)}
                onBlur={(event) => setPromoPrice(normalizeMoneyDisplay(event.target.value))}
                required
                placeholder="0,00"
                className="mt-2 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-200">Inicio da promocao</span>
              <input
                type="datetime-local"
                value={promoStartsAt}
                onChange={(event) => setPromoStartsAt(event.target.value)}
                className="mt-2 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
              <span className="mt-2 block text-xs text-zinc-500">
                Deixe vazio para iniciar imediatamente.
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-200">Fim da promocao</span>
              <input
                type="datetime-local"
                value={promoEndsAt}
                min={promoStartsAt || undefined}
                onChange={(event) => setPromoEndsAt(event.target.value)}
                className="mt-2 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
              <span className="mt-2 block text-xs text-zinc-500">
                Deixe vazio para manter sem data final.
              </span>
            </label>
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
        <div>
          <span className="text-sm font-semibold text-zinc-200">Imagem do produto</span>
          <label className="mt-2 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-white/20 bg-white/5 px-4 py-6 text-center transition hover:border-rose-400/70 hover:bg-white/10">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={!imageUrl && !imageFile}
              onChange={(event) => handleImageChange(event.target.files?.[0])}
              className="sr-only"
            />
            <span className="text-sm font-semibold text-white">
              {imageFile ? imageFile.name : imageUrl ? 'Trocar imagem' : 'Selecionar imagem'}
            </span>
            <span className="mt-1 text-xs text-zinc-400">PNG, JPG ou WEBP ate 5MB</span>
          </label>
          {imagePreview ? (
            <div className="mt-3 overflow-hidden rounded-md border border-white/10 bg-zinc-950">
              <img
                src={imagePreview}
                alt={imageAlt || name || 'Previa do produto'}
                className="h-56 w-full object-cover"
              />
            </div>
          ) : null}
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-200">Texto alternativo</span>
          <input
            value={imageAlt}
            onChange={(event) => setImageAlt(event.target.value)}
            className="mt-2 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <label className="block">
          <span className="text-sm font-semibold text-zinc-200">Categoria</span>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            required
            className="mt-2 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-200">Tamanhos</span>
          <input
            value={sizes}
            onChange={(event) => setSizes(event.target.value)}
            required
            className="mt-2 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-200">Cores</span>
          <input
            value={colors}
            onChange={(event) => setColors(event.target.value)}
            required
            className="mt-2 w-full rounded-md border border-white/10 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-3 text-sm font-semibold text-zinc-200">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-5 w-5 rounded border-zinc-400 text-rose-600 focus:ring-rose-500"
          />
          Publicado
        </label>

        <label className="flex items-center gap-3 text-sm font-semibold text-zinc-200">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) => setIsFeatured(event.target.checked)}
            className="h-5 w-5 rounded border-zinc-400 text-rose-600 focus:ring-rose-500"
          />
          Destaque na home
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Salvando...' : isEdit ? 'Atualizar produto' : 'Salvar produto'}
        </button>
        {status.message ? (
          <p className={status.type === 'error' ? 'text-sm text-red-300' : 'text-sm text-emerald-300'}>
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
