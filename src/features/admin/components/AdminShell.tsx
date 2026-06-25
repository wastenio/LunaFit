import Link from 'next/link';
import {
  BarChart3,
  BellRing,
  LogOut,
  PackageSearch,
  Plus,
  Store,
  Tags,
} from 'lucide-react';
import { countOrdersAwaitingAction } from '@/features/orders/order-data';
import { logoutAdminAction } from '../actions';

type AdminShellProps = {
  children: React.ReactNode;
};

export async function AdminShell({ children }: AdminShellProps) {
  const awaitingOrders = await countOrdersAwaitingAction();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 bg-zinc-950/95">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/admin" className="text-lg font-semibold tracking-tight">
              LunaFit Admin
            </Link>
            <p className="mt-1 text-sm text-zinc-400">Produtos, pedidos e operacao da loja.</p>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 font-semibold text-zinc-100 transition hover:bg-white hover:text-zinc-950"
            >
              <Store aria-hidden="true" className="h-4 w-4" />
              Ver loja
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 font-semibold text-zinc-100 transition hover:bg-white hover:text-zinc-950"
            >
              <Tags aria-hidden="true" className="h-4 w-4" />
              Produtos
            </Link>
            <Link
              href="/admin/pedidos"
              className={`relative inline-flex items-center gap-2 rounded-md border px-4 py-2 font-semibold transition ${
                awaitingOrders > 0
                  ? 'border-amber-300/60 bg-amber-400/10 text-amber-100 hover:bg-amber-300 hover:text-zinc-950'
                  : 'border-white/15 text-zinc-100 hover:bg-white hover:text-zinc-950'
              }`}
              aria-label={
                awaitingOrders > 0
                  ? `Pedidos: ${awaitingOrders} aguardando procedimento`
                  : 'Pedidos'
              }
            >
              {awaitingOrders > 0 ? (
                <BellRing aria-hidden="true" className="h-4 w-4" />
              ) : (
                <PackageSearch aria-hidden="true" className="h-4 w-4" />
              )}
              Pedidos
              {awaitingOrders > 0 ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-300 px-1.5 text-[11px] font-bold text-zinc-950">
                  {awaitingOrders > 99 ? '99+' : awaitingOrders}
                </span>
              ) : null}
            </Link>
            <Link
              href="/admin/relatorios"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 font-semibold text-zinc-100 transition hover:bg-white hover:text-zinc-950"
            >
              <BarChart3 aria-hidden="true" className="h-4 w-4" />
              Relatorios
            </Link>
            <Link
              href="/admin/novo"
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 font-semibold text-white transition hover:bg-rose-500"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Novo produto
            </Link>
            <form action={logoutAdminAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 font-semibold text-zinc-100 transition hover:bg-white hover:text-zinc-950"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
