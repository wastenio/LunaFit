'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

type PasswordFieldProps = {
  label: string;
  name: string;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
};

export function PasswordField({
  label,
  name,
  autoComplete,
  hint,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block">
      <span className="text-sm font-semibold text-zinc-800">{label}</span>
      <span className="relative mt-2 block">
        <input
          name={name}
          type={isVisible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={8}
          maxLength={128}
          className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 pr-12 text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
          aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
          title={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {isVisible ? (
            <EyeOff aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Eye aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </span>
      {hint ? <span className="mt-2 block text-xs leading-5 text-zinc-500">{hint}</span> : null}
    </label>
  );
}
