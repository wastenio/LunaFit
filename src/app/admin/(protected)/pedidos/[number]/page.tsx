import Image from 'next/image';
import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { formatCents } from '@/lib/money';
import { updateOrderStatusAction } from '@/features/orders/actions';
import { getOrderForAdmin } from '@/features/orders/order-data';
import {
  getAvailableOrderStatuses,
  orderStatusLabels,
} from '@/features/orders/order-status';

export const dynamic = 'force-dynamic';

type AdminOrderPageProps = {
  params: Promise<{
    number: string;
  }>;
};

export default async function AdminOrderPage({ params }: AdminOrderPageProps) {
  const { number } = await params;
  const order = await getOrderForAdmin(number);

  if (!order) {
    notFound();
  }

  const updateStatus = updateOrderStatusAction.bind(null, order.number);
  const availableStatuses = getAvailableOrderStatuses(order.status);
  const isTerminal = availableStatuses.length === 1;

  return (
    <section>
      <Link href="/admin/pedidos" className="text-sm font-semibold text-rose-300 hover:text-white">
        Voltar para pedidos
      </Link>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-300">
            Pedido
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{order.number}</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {new Intl.DateTimeFormat('pt-BR', {
              dateStyle: 'long',
              timeStyle: 'short',
            }).format(order.createdAt)}
          </p>
        </div>
        <form action={updateStatus} className="flex items-center gap-2">
          <select
            name="status"
            defaultValue={order.status}
            disabled={isTerminal}
            className="rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {orderStatusLabels[status]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isTerminal}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-40"
          >
            Atualizar
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="divide-y divide-white/10 border-y border-white/10">
          {order.items.map((item) => (
            <article key={item.id} className="grid grid-cols-[80px_1fr_auto] gap-4 py-5">
              <div className="relative aspect-[4/5] overflow-hidden bg-white/10">
                <Image
                  src={item.imageUrl}
                  alt={item.productName}
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div>
                <p className="font-semibold text-white">{item.productName}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {item.quantity}x - {item.size} - {item.color}
                </p>
                <p className="mt-2 text-sm text-zinc-300">
                  {formatCents(item.unitPriceInCents)} cada
                </p>
              </div>
              <p className="font-semibold text-white">{formatCents(item.totalInCents)}</p>
            </article>
          ))}
        </div>

        <aside className="h-fit border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-semibold text-white">Cliente e entrega</p>
          <p className="mt-4 text-sm leading-6 text-zinc-300">
            {order.customerName}
            <br />
            {order.customerEmail}
            <br />
            {order.phone}
          </p>
          <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-zinc-300">
            {order.addressLine}, {order.addressNumber}
            {order.addressComplement ? `, ${order.addressComplement}` : ''}
            <br />
            {order.neighborhood}
            <br />
            {order.city} - {order.state}
            <br />
            CEP {order.postalCode}
          </p>
          {order.notes ? (
            <p className="mt-4 border-t border-white/10 pt-4 text-sm text-zinc-400">
              Observacao: {order.notes}
            </p>
          ) : null}
          <div className="mt-5 flex justify-between border-t border-white/10 pt-5">
            <span className="font-semibold text-white">Total</span>
            <span className="font-semibold text-white">{formatCents(order.totalInCents)}</span>
          </div>
        </aside>
      </div>

      <section className="mt-10 border-t border-white/10 pt-8">
        <h2 className="text-xl font-semibold text-white">Historico operacional</h2>
        <div className="mt-5 space-y-5">
          {order.statusEvents.map((event) => (
            <article key={event.id} className="grid grid-cols-[32px_1fr] gap-3">
              <CircleCheck aria-hidden="true" className="mt-0.5 h-5 w-5 text-rose-300" />
              <div>
                <p className="font-semibold text-white">{event.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{event.message}</p>
                <time
                  className="mt-2 block text-xs text-zinc-500"
                  dateTime={event.createdAt.toISOString()}
                >
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(event.createdAt)}
                </time>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
