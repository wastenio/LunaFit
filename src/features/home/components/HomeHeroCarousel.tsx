'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCents } from '@/lib/money';
import { getPromotionStatus } from '@/features/products/product-promotion';

export type HomeHeroProduct = {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  imageUrl: string;
  imageAlt: string | null;
  priceInCents: number;
  promoPriceInCents: number | null;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
};

type HomeHeroCarouselProps = {
  storeName: string;
  storeDescription: string;
  products: HomeHeroProduct[];
};

type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  href: string;
  actionLabel: string;
  product?: HomeHeroProduct;
};

export function HomeHeroCarousel({
  storeName,
  storeDescription,
  products,
}: HomeHeroCarouselProps) {
  const slides = useMemo<HeroSlide[]>(
    () => [
      {
        id: 'campaign',
        eyebrow: storeName,
        title: 'Potencia para treinar. Estilo para continuar.',
        description: storeDescription,
        imageUrl: '/images/home/lunafit-campaign-hero.png',
        imageAlt: 'Mulheres usando moda fitness em um estudio contemporaneo',
        href: '/produtos',
        actionLabel: 'Conhecer a colecao',
      },
      {
        id: 'campaign-run',
        eyebrow: 'Performance com identidade',
        title: 'Seu ritmo merece acompanhar quem voce se tornou.',
        description:
          'Pecas que combinam liberdade de movimento, presenca e conforto para uma rotina ativa.',
        imageUrl: '/images/home/lunafit-campaign-run.png',
        imageAlt: 'Duas mulheres correndo em um ambiente urbano contemporaneo',
        href: '/produtos',
        actionLabel: 'Explorar novidades',
      },
      {
        id: 'campaign-strength',
        eyebrow: 'Forca em cada detalhe',
        title: 'Confianca para ir alem do treino.',
        description:
          'Uma curadoria fitness feminina criada para vestir movimento, equilibrio e atitude.',
        imageUrl: '/images/home/lunafit-campaign-strength.png',
        imageAlt: 'Mulheres em um treino de forca e mobilidade',
        href: '/produtos',
        actionLabel: 'Ver a colecao',
      },
      ...products.map((product) => ({
        id: `product-${product.id}`,
        eyebrow: product.category,
        title: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        imageAlt: product.imageAlt || product.name,
        href: `/produtos/${product.slug}`,
        actionLabel: 'Ver detalhes',
        product,
      })),
    ],
    [products, storeDescription, storeName]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (paused || reducedMotion || slides.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  function goToPrevious() {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  }

  function goToNext() {
    setActiveIndex((current) => (current + 1) % slides.length);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    if (touchStartX.current === null) {
      return;
    }

    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(distance) < 45) {
      return;
    }

    if (distance > 0) {
      goToPrevious();
      return;
    }

    goToNext();
  }

  const visibleIndex = activeIndex % slides.length;
  const activeSlide = slides[visibleIndex];
  const hasActivePromotion =
    activeSlide.product && getPromotionStatus(activeSlide.product) === 'active';
  const currentPrice = hasActivePromotion
    ? activeSlide.product?.promoPriceInCents
    : activeSlide.product?.priceInCents;

  return (
    <section
      className="relative h-[calc(100svh-140px)] min-h-[520px] max-h-[760px] overflow-hidden bg-zinc-950 text-white"
      aria-roledescription="carrossel"
      aria-label="Destaques da LunaFit"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0].clientX;
      }}
      onTouchEnd={handleTouchEnd}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === visibleIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          aria-hidden={index !== visibleIndex}
        >
          <Image
            src={slide.imageUrl}
            alt={slide.imageAlt}
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover object-center md:object-[center_42%]"
            unoptimized={slide.imageUrl.startsWith('/uploads/')}
          />
          <div className="absolute inset-0 bg-zinc-950/55" />
        </div>
      ))}

      <div className="relative z-10 mx-auto flex h-full max-w-6xl items-end px-5 pb-20 pt-16 sm:items-center sm:pb-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-200">
            {activeSlide.eyebrow}
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
            {activeSlide.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-200 sm:text-lg">
            {activeSlide.description}
          </p>

          {activeSlide.product ? (
            <div className="mt-5 flex items-center gap-3">
              <span className="text-xl font-semibold text-white">
                {formatCents(currentPrice ?? activeSlide.product.priceInCents)}
              </span>
              {hasActivePromotion ? (
                <span className="text-sm text-zinc-300 line-through">
                  {formatCents(activeSlide.product.priceInCents)}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={activeSlide.href}
              className="rounded-md bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {activeSlide.actionLabel}
            </Link>
            <Link
              href="/contato"
              className="rounded-md border border-white/40 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white hover:text-zinc-950"
            >
              Falar com a loja
            </Link>
          </div>
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-5 z-20 mx-auto flex max-w-6xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 transition-all ${
                  index === visibleIndex ? 'w-9 bg-white' : 'w-5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ir para destaque ${index + 1}`}
                aria-current={index === visibleIndex ? 'true' : undefined}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={goToPrevious}
              className="grid h-10 w-10 place-items-center border border-white/35 bg-black/20 text-xl text-white transition hover:border-white hover:bg-white hover:text-zinc-950"
              aria-label="Destaque anterior"
            >
              &#8592;
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="grid h-10 w-10 place-items-center border border-white/35 bg-black/20 text-xl text-white transition hover:border-white hover:bg-white hover:text-zinc-950"
              aria-label="Proximo destaque"
            >
              &#8594;
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
