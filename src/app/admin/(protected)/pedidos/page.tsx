import { AdminOrderList } from '@/features/orders/components/AdminOrderList';
import { listOrdersForAdmin } from '@/features/orders/order-data';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pedidos | LunaFit Admin',
};

export default async function AdminOrdersPage() {
  const orders = await listOrdersForAdmin();

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-300">
            Operacao
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Pedidos</h1>
        </div>
        <p className="text-sm text-zinc-400">
          {orders.length} {orders.length === 1 ? 'pedido recebido' : 'pedidos recebidos'}
        </p>
      </div>

      <div className="mt-8">
        <AdminOrderList orders={orders} />
      </div>
    </section>
  );
}
