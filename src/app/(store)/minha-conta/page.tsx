import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell, PackageCheck, ShoppingBag } from 'lucide-react';
import { formatCents } from '@/lib/money';
import { getCustomerSession } from '@/lib/customer-auth';
import { listOrdersForUser } from '@/features/orders/order-data';
import { getOrderStatusLabel } from '@/features/orders/order-status';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Minha conta | LunaFit',
};

export default async function CustomerAccountPage() {
  const session = await getCustomerSession();

  if (!session) {
    redirect('/login?callbackUrl=/minha-conta');
  }

  const orders = await listOrdersForUser(session.user.id);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
        Conta LunaFit
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-zinc-950">
        Ola, {session.user.name?.split(' ')[0] || 'cliente'}
      </h1>
      <p className="mt-3 text-sm text-zinc-600">{session.user.email}</p>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-zinc-950">Meus pedidos</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/notificacoes"
              className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700 hover:text-zinc-950"
            >
              <Bell aria-hidden="true" className="h-4 w-4" />
              Notificacoes
            </Link>
            <Link
              href="/carrinho"
              className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700 hover:text-zinc-950"
            >
              <ShoppingBag aria-hidden="true" className="h-4 w-4" />
              Ver carrinho
            </Link>
          </div>
        </div>

        {orders.length > 0 ? (
          <div className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/pedidos/${order.number}`}
                className="grid gap-3 py-5 transition hover:bg-zinc-50 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-4"
              >
                <div>
                  <p className="font-semibold text-zinc-950">{order.number}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'long',
                    }).format(order.createdAt)}
                  </p>
                </div>
                <span className="text-sm text-zinc-600">
                  {getOrderStatusLabel(order.status)} - {order._count.items}{' '}
                  {order._count.items === 1 ? 'produto' : 'produtos'}
                </span>
                <span className="font-semibold text-zinc-950">
                  {formatCents(order.totalInCents)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
            <PackageCheck aria-hidden="true" className="mx-auto h-9 w-9 text-zinc-400" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-950">Nenhum pedido ainda</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Quando voce finalizar uma compra, o acompanhamento aparecera aqui.
            </p>
            <Link
              href="/produtos"
              className="mt-5 inline-flex rounded-md bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Explorar produtos
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
