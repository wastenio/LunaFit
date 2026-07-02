import Link from 'next/link';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer-auth';
import { formatCents } from '@/lib/money';
import { getOrderForUser } from '@/features/orders/order-data';
import { MercadoPagoPaymentBrick } from '@/features/payments/components/MercadoPagoPaymentBrick';

export const dynamic = 'force-dynamic';

type PaymentPageProps = {
  params: Promise<{
    number: string;
  }>;
};

export const metadata = {
  title: 'Pagamento | LunaFit',
};

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { number } = await params;
  const session = await getCustomerSession();

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/pagamento/${number}`)}`);
  }

  const order = await getOrderForUser(session.user.id, number);

  if (!order) {
    notFound();
  }

  if (
    order.status === 'CANCELLED' ||
    order.status === 'COMPLETED' ||
    order.paymentStatus === 'APPROVED' ||
    order.paymentStatus === 'REFUNDED' ||
    order.paymentStatus === 'CHARGED_BACK'
  ) {
    redirect(`/pedidos/${encodeURIComponent(order.number)}?paymentLink=closed`);
  }

  const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY?.trim();
  const isSandbox = publicKey?.startsWith('TEST-');
  const amount = Number((order.totalInCents / 100).toFixed(2));

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-12 lg:grid-cols-[1fr_340px]">
      <section className="border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <CreditCard aria-hidden="true" className="h-6 w-6" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
          Pagamento Mercado Pago
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-950">
          Pedido {order.number}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          Escolha Pix, cartao ou boleto no ambiente oficial do Mercado Pago. Assim que a
          confirmacao chegar, seu pedido sera atualizado automaticamente.
        </p>

        <div className="mt-8 max-w-2xl">
          {isSandbox ? (
            <div className="mb-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              Ambiente de teste: use uma janela anonima com login Mercado Pago na conta
              Comprador de teste desta aplicacao. Nao use a conta real ou vendedora.
            </div>
          ) : null}
          {publicKey ? (
            <MercadoPagoPaymentBrick
              amount={amount}
              customerEmail={order.customerEmail}
              orderNumber={order.number}
              publicKey={publicKey}
            />
          ) : (
            <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              A chave publica do Mercado Pago ainda nao esta configurada.
            </div>
          )}
        </div>

        <Link
          href={`/pedidos/${encodeURIComponent(order.number)}`}
          className="mt-6 inline-flex text-sm font-semibold text-zinc-600 transition hover:text-rose-700"
        >
          Voltar ao acompanhamento do pedido
        </Link>
      </section>

      <aside className="h-fit border border-zinc-200 bg-zinc-50 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 text-emerald-600" />
          Resumo protegido
        </div>
        <div className="mt-5 divide-y divide-zinc-200">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 py-4 text-sm">
              <div>
                <p className="font-semibold text-zinc-950">
                  {item.quantity}x {item.productName}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.size} - {item.color}
                </p>
              </div>
              <span className="shrink-0 text-zinc-700">{formatCents(item.totalInCents)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-zinc-300 pt-4">
          <span className="font-semibold text-zinc-950">Produtos</span>
          <span className="font-semibold text-zinc-950">
            {formatCents(order.subtotalInCents)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-zinc-600">Frete</span>
          <span className="font-semibold text-zinc-950">
            {formatCents(order.shippingInCents)}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-zinc-300 pt-4">
          <span className="font-semibold text-zinc-950">Total</span>
          <span className="text-lg font-semibold text-zinc-950">
            {formatCents(order.totalInCents)}
          </span>
        </div>
      </aside>
    </main>
  );
}
