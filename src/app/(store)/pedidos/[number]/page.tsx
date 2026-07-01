import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, Circle, CircleX, Clock3 } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { formatCents } from '@/lib/money';
import { getCustomerSession } from '@/lib/customer-auth';
import { getOrderForUser } from '@/features/orders/order-data';
import { getOrderStatusLabel } from '@/features/orders/order-status';
import { getPaymentStatusLabel } from '@/features/payments/payment-status';

export const dynamic = 'force-dynamic';

type OrderPageProps = {
  params: Promise<{
    number: string;
  }>;
};

export const metadata = {
  title: 'Pedido | LunaFit',
};

export default async function OrderPage({ params }: OrderPageProps) {
  const { number } = await params;
  const session = await getCustomerSession();

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/pedidos/${number}`)}`);
  }

  const order = await getOrderForUser(session.user.id, number);

  if (!order) {
    notFound();
  }

  const isCancelled = order.status === 'CANCELLED';
  const isPaymentApproved = order.paymentStatus === 'APPROVED';
  const isPending = order.status === 'PENDING' || !isPaymentApproved;
  const isCompleted = order.status === 'COMPLETED';
  const statusTheme = isCancelled
    ? {
        border: 'border-red-200 bg-red-50',
        text: 'text-red-700',
        icon: <CircleX aria-hidden="true" className="h-10 w-10 text-red-600" />,
      }
    : isPending
      ? {
          border: 'border-amber-200 bg-amber-50',
          text: 'text-amber-800',
          icon: <Clock3 aria-hidden="true" className="h-10 w-10 text-amber-600" />,
        }
      : {
          border: 'border-emerald-200 bg-emerald-50',
          text: 'text-emerald-700',
          icon: <CheckCircle2 aria-hidden="true" className="h-10 w-10 text-emerald-600" />,
        };

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <section className={`border p-6 sm:p-8 ${statusTheme.border}`}>
        {statusTheme.icon}
        <p
          className={`mt-5 text-xs font-semibold uppercase tracking-[0.2em] ${statusTheme.text}`}
        >
          {getPaymentStatusLabel(order.paymentStatus)} - {getOrderStatusLabel(order.status)}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">{order.number}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          {isCancelled
            ? 'Este pedido foi cancelado. Entre em contato com a LunaFit caso precise de ajuda.'
            : !isPaymentApproved
              ? 'Seu pedido foi reservado e aguarda a confirmacao de pagamento pelo Mercado Pago.'
              : isPending
                ? 'Pagamento aprovado. Seu pedido aguarda o recebimento da equipe LunaFit.'
              : isCompleted
                ? 'Seu pedido foi concluido. Obrigado por comprar com a LunaFit.'
                : 'Seu pedido esta em andamento. Acompanhe abaixo cada atualizacao registrada pela equipe LunaFit.'}
        </p>
        {!isCancelled && !isPaymentApproved && order.paymentInitPoint ? (
          <Link
            href={order.paymentInitPoint}
            className="mt-6 inline-flex rounded-md bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Concluir pagamento
          </Link>
        ) : null}
      </section>

      <section className="mt-8 border-y border-zinc-200 py-7">
        <h2 className="text-xl font-semibold text-zinc-950">Acompanhamento</h2>
        <div className="mt-6">
          {order.statusEvents.map((event, index) => {
            const isLatest = index === order.statusEvents.length - 1;

            return (
              <article
                key={event.id}
                className="relative grid grid-cols-[36px_1fr] gap-4 pb-7 last:pb-0"
              >
                {index < order.statusEvents.length - 1 ? (
                  <span className="absolute bottom-0 left-[17px] top-7 w-px bg-zinc-200" />
                ) : null}
                <span
                  className={`relative z-10 grid h-9 w-9 place-items-center rounded-full ${
                    isLatest ? 'bg-rose-600 text-white' : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {isLatest ? (
                    <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                  ) : (
                    <Circle aria-hidden="true" className="h-4 w-4" />
                  )}
                </span>
                <div>
                  <p className="font-semibold text-zinc-950">{event.title}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">{event.message}</p>
                  <time
                    className="mt-2 block text-xs text-zinc-500"
                    dateTime={event.createdAt.toISOString()}
                  >
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    }).format(event.createdAt)}
                  </time>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="text-xl font-semibold text-zinc-950">Produtos</h2>
          <div className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200">
            {order.items.map((item) => (
              <article key={item.id} className="grid grid-cols-[80px_1fr_auto] gap-4 py-5">
                <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
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
                  <p className="font-semibold text-zinc-950">{item.productName}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {item.quantity}x - {item.size} - {item.color}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">
                    {formatCents(item.unitPriceInCents)} cada
                  </p>
                </div>
                <p className="font-semibold text-zinc-950">{formatCents(item.totalInCents)}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="h-fit border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="font-semibold text-zinc-950">Pagamento</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {getPaymentStatusLabel(order.paymentStatus)}
            <br />
            Mercado Pago
          </p>
          {!isCancelled && !isPaymentApproved && order.paymentInitPoint ? (
            <Link
              href={order.paymentInitPoint}
              className="mt-4 inline-flex rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-rose-600 hover:text-rose-700"
            >
              Abrir pagamento
            </Link>
          ) : null}

          <div className="mt-6 border-t border-zinc-200 pt-6">
          <h2 className="font-semibold text-zinc-950">Entrega</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {order.customerName}
            <br />
            {order.addressLine}, {order.addressNumber}
            {order.addressComplement ? `, ${order.addressComplement}` : ''}
            <br />
            {order.neighborhood}
            <br />
            {order.city} - {order.state}
            <br />
            CEP {order.postalCode}
          </p>
          </div>
          <div className="mt-5 flex justify-between border-t border-zinc-200 pt-5">
            <span className="font-semibold text-zinc-950">Total dos produtos</span>
            <span className="font-semibold text-zinc-950">
              {formatCents(order.totalInCents)}
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            O pagamento online cobre os produtos do pedido.
          </p>
          <Link
            href="/minha-conta"
            className="mt-5 inline-flex text-sm font-semibold text-rose-700 hover:text-zinc-950"
          >
            Ver meus pedidos
          </Link>
        </aside>
      </div>
    </main>
  );
}
