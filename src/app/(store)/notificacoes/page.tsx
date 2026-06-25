import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { markAllNotificationsReadAction } from '@/features/notifications/actions';
import { listNotificationsForUser } from '@/features/notifications/notification-data';
import { getCustomerSession } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Notificacoes | LunaFit',
};

export default async function NotificationsPage() {
  const session = await getCustomerSession();

  if (!session) {
    redirect('/login?callbackUrl=/notificacoes');
  }

  const notifications = await listNotificationsForUser(session.user.id);
  const hasUnreadNotifications = notifications.some((notification) => !notification.readAt);

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
            Sua conta
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-zinc-950">Notificacoes</h1>
          <p className="mt-3 text-sm text-zinc-600">
            Atualizacoes sobre o andamento dos seus pedidos.
          </p>
        </div>
        {hasUnreadNotifications ? (
          <form action={markAllNotificationsReadAction}>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
            >
              <CheckCheck aria-hidden="true" className="h-4 w-4" />
              Marcar todas como lidas
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length > 0 ? (
        <div className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={`/notificacoes/${notification.id}`}
              className={`grid gap-4 px-4 py-5 transition hover:bg-zinc-50 sm:grid-cols-[auto_1fr_auto] ${
                notification.readAt ? 'bg-white' : 'bg-rose-50/60'
              }`}
            >
              <span
                className={`mt-1 grid h-9 w-9 place-items-center rounded-full ${
                  notification.readAt
                    ? 'bg-zinc-100 text-zinc-500'
                    : 'bg-rose-600 text-white'
                }`}
              >
                <Bell aria-hidden="true" className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-semibold text-zinc-950">
                  {notification.title}
                </span>
                <span className="mt-1 block text-sm leading-6 text-zinc-600">
                  {notification.message}
                </span>
                {notification.order ? (
                  <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                    Ver pedido {notification.order.number}
                  </span>
                ) : null}
              </span>
              <time className="text-xs text-zinc-500" dateTime={notification.createdAt.toISOString()}>
                {new Intl.DateTimeFormat('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(notification.createdAt)}
              </time>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
          <Bell aria-hidden="true" className="mx-auto h-9 w-9 text-zinc-400" />
          <h2 className="mt-4 text-lg font-semibold text-zinc-950">
            Nenhuma notificacao ainda
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            As atualizacoes dos seus pedidos aparecerao aqui.
          </p>
        </div>
      )}
    </main>
  );
}
