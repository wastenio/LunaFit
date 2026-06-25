'use client';

import { useEffect, useRef, useState } from 'react';

type ProductRailProps = {
  children: React.ReactNode;
  label: string;
  dark?: boolean;
};

export function ProductRail({ children, label, dark = false }: ProductRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(true);

  function updateControls() {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    setCanGoBack(rail.scrollLeft > 4);
    setCanGoForward(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
  }

  useEffect(() => {
    updateControls();
    window.addEventListener('resize', updateControls);

    return () => window.removeEventListener('resize', updateControls);
  }, []);

  function scroll(direction: -1 | 1) {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    rail.scrollBy({
      behavior: 'smooth',
      left: direction * Math.max(280, rail.clientWidth * 0.78),
    });
  }

  const buttonClass = dark
    ? 'border-white/25 text-white hover:border-white hover:bg-white hover:text-zinc-950 disabled:border-white/10 disabled:text-white/25'
    : 'border-zinc-300 text-zinc-900 hover:border-zinc-950 hover:bg-zinc-950 hover:text-white disabled:border-zinc-200 disabled:text-zinc-300';

  return (
    <div className="relative">
      <div className="mb-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={!canGoBack}
          className={`grid h-10 w-10 place-items-center border text-xl transition disabled:cursor-not-allowed ${buttonClass}`}
          aria-label={`Voltar no carrossel ${label}`}
        >
          &#8592;
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={!canGoForward}
          className={`grid h-10 w-10 place-items-center border text-xl transition disabled:cursor-not-allowed ${buttonClass}`}
          aria-label={`Avancar no carrossel ${label}`}
        >
          &#8594;
        </button>
      </div>

      <div
        ref={railRef}
        onScroll={updateControls}
        className="storefront-rail flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}
