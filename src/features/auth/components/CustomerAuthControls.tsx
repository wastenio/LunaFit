import Link from 'next/link';
import { LogIn, LogOut, ShoppingBag, UserRound } from 'lucide-react';
import { getCustomerSession } from '@/lib/customer-auth';
import { getCartItemCount } from '@/features/cart/cart-data';
import { countUnreadNotifications } from '@/features/notifications/notification-data';
import { CustomerNotificationButton } from '@/features/notifications/components/CustomerNotificationButton';
import { logoutCustomerAction } from '../actions';

export async function CustomerAuthControls() {
  const session = await getCustomerSession();

  if (!session) {
    return (
      <div className="flex items-center gap-1">
        <Link
          href="/login"
          className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
        >
          <LogIn aria-hidden="true" className="h-4 w-4" />
          <span className="hidden md:inline">Entrar</span>
        </Link>
        <Link
          href="/login?callbackUrl=/carrinho"
          className="relative grid h-10 w-10 place-items-center rounded-md text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
          aria-label="Entrar para acessar o carrinho"
          title="Carrinho"
        >
          <ShoppingBag aria-hidden="true" className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  const [itemCount, unreadNotificationCount] = await Promise.all([
    getCartItemCount(session.user.id),
    countUnreadNotifications(session.user.id),
  ]);

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/minha-conta"
        className="inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
        title="Minha conta"
      >
        <UserRound aria-hidden="true" className="h-5 w-5" />
        <span className="hidden max-w-28 truncate lg:inline">
          {session.user.name?.split(' ')[0] || 'Minha conta'}
        </span>
      </Link>
      <CustomerNotificationButton initialCount={unreadNotificationCount} />
      <Link
        href="/carrinho"
        className="relative grid h-10 w-10 place-items-center rounded-md text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
        aria-label={`Carrinho com ${itemCount} item(ns)`}
        title="Carrinho"
      >
        <ShoppingBag aria-hidden="true" className="h-5 w-5" />
        {itemCount > 0 ? (
          <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        ) : null}
      </Link>
      <form action={logoutCustomerAction}>
        <button
          type="submit"
          className="grid h-10 w-10 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
          aria-label="Sair da conta"
          title="Sair"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
