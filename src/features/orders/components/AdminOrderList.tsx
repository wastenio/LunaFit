import Link from 'next/link';
import { formatCents } from '@/lib/money';
import { updateOrderStatusAction } from '../actions';
import type { listOrdersForAdmin } from '../order-data';
import { getAvailableOrderStatuses, orderStatusLabels } from '../order-status';

type AdminOrderListProps = {
  orders: Awaited<ReturnType<typeof listOrdersForAdmin>>;
};

export function AdminOrderList({ orders }: AdminOrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="border border-dashed border-white/15 bg-white/[0.04] p-10 text-center">
        <h2 className="text-xl font-semibold text-white">Nenhum pedido recebido</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Os pedidos finalizados por clientes aparecerao automaticamente aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/10 border-y border-white/10">
      {orders.map((order) => {
        const updateStatus = updateOrderStatusAction.bind(null, order.number);
        const availableStatuses = getAvailableOrderStatuses(order.status);
        const isTerminal = availableStatuses.length === 1;

        return (
          <article
            key={order.id}
            className="grid gap-5 py-6 lg:grid-cols-[1fr_0.8fr_auto] lg:items-center"
          >
            <div>
              <Link
                href={`/admin/pedidos/${order.number}`}
                className="font-semibold text-white hover:text-rose-300"
              >
                {order.number}
              </Link>
              <p className="mt-2 text-sm text-zinc-300">{order.customerName}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {order.customerEmail} - {order.phone}
              </p>
            </div>
            <div className="text-sm text-zinc-400">
              <p>
                {new Intl.DateTimeFormat('pt-BR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(order.createdAt)}
              </p>
              <p className="mt-2">
                {order._count.items} {order._count.items === 1 ? 'item' : 'itens'} -{' '}
                <span className="font-semibold text-white">{formatCents(order.totalInCents)}</span>
              </p>
            </div>
            <form action={updateStatus} className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`status-${order.id}`}>
                Status do pedido {order.number}
              </label>
              <select
                id={`status-${order.id}`}
                name="status"
                defaultValue={order.status}
                disabled={isTerminal}
                className="rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-rose-400"
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
                className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Salvar
              </button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
