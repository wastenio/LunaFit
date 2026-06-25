import Link from 'next/link';
import { getStoreConfig } from '@/config/store';
import { CustomerAuthControls } from '@/features/auth/components/CustomerAuthControls';

const navigation = [
  { href: '/', label: 'Inicio' },
  { href: '/produtos', label: 'Produtos' },
  { href: '/contato', label: 'Contato' },
];

export async function SiteHeader() {
  const store = getStoreConfig();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur">
      <div className="bg-zinc-950 px-5 py-2 text-center text-xs font-medium text-zinc-200">
        Moda fitness feminina para treino, rotina e movimento
      </div>
      <div className="border-b border-zinc-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-5">
          <Link href="/" className="text-xl font-black uppercase text-zinc-950">
            {store.name}
          </Link>
          <nav className="ml-auto hidden items-center gap-1 text-sm font-semibold text-zinc-600 sm:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 transition hover:bg-zinc-100 hover:text-zinc-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <CustomerAuthControls />
        </div>
      </div>
    </header>
  );
}
