import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer-auth';
import { getCartForUser } from '@/features/cart/cart-data';
import { CartView } from '@/features/cart/components/CartView';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Carrinho | LunaFit',
};

export default async function CartPage() {
  const session = await getCustomerSession();

  if (!session) {
    redirect('/login?callbackUrl=/carrinho');
  }

  const cart = await getCartForUser(session.user.id);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">Sua selecao</p>
      <h1 className="mt-3 text-4xl font-semibold text-zinc-950">Carrinho</h1>
      <p className="mt-3 text-sm text-zinc-600">
        Revise variacoes e quantidades antes de finalizar.
      </p>

      <div className="mt-9">
        <CartView initialCart={cart} />
      </div>
    </main>
  );
}
