import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer-auth';
import { getPrisma } from '@/lib/prisma';
import { getCartForUser } from '@/features/cart/cart-data';
import { CheckoutForm } from '@/features/orders/components/CheckoutForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Finalizar pedido | LunaFit',
};

export default async function CheckoutPage() {
  const session = await getCustomerSession();

  if (!session) {
    redirect('/login?callbackUrl=/checkout');
  }

  const [cart, user] = await Promise.all([
    getCartForUser(session.user.id),
    getPrisma().user.findUnique({
      select: { phone: true },
      where: { id: session.user.id },
    }),
  ]);

  if (cart.items.length === 0) {
    redirect('/carrinho');
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
        Ultima etapa
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-zinc-950">Finalizar pedido</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        Informe os dados para entrega. Em seguida, voce sera direcionada ao Mercado Pago para
        pagar com cartao, Pix ou outro meio disponivel.
      </p>

      <div className="mt-9">
        <CheckoutForm
          cart={cart}
          defaultName={session.user.name || ''}
          defaultPhone={user?.phone || ''}
          email={session.user.email || ''}
        />
      </div>
    </main>
  );
}
