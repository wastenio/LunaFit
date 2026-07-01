import Image from 'next/image';
import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { formatCents } from '@/lib/money';
import {
  refundOrderPaymentAction,
  updateOrderStatusAction,
} from '@/features/orders/actions';
import { getOrderForAdmin } from '@/features/orders/order-data';
import {
  getAvailableOrderStatuses,
  orderStatusLabels,
} from '@/features/orders/order-status';
import { getPaymentStatusLabel } from '@/features/payments/payment-status';

export const dynamic = 'force-dynamic';

type AdminOrderPageProps = {
  params: Promise<{
    number: string;
  }>;
  searchParams: Promise<{
    refund?: string | string[];
  }>;
};

function getRefundMessage(value?: string | string[]) {
  const result = Array.isArray(value) ? value[0] : value;

  switch (result) {
    case 'success':
      return {
        tone: 'success',
        text: 'Reembolso solicitado ao Mercado Pago e pedido atualizado.',
      };
    case 'already-refunded':
      return {
        tone: 'info',
        text: 'Este pedido ja possui reembolso registrado ou em processamento.',
      };
    case 'missing-payment':
      return {
        tone: 'error',
        text: 'Nao ha ID de pagamento do Mercado Pago para reembolsar este pedido.',
      };
    case 'missing-confirmation':
      return {
        tone: 'error',
        text: 'Confirme a autorizacao antes de solicitar o reembolso.',
      };
    case 'not-approved':
      return {
        tone: 'error',
        text: 'Somente pagamentos aprovados podem ser reembolsados pelo admin.',
      };
    case 'completed':
      return {
        tone: 'error',
        text: 'Pedidos concluidos nao podem ser cancelados por este fluxo de reembolso.',
      };
    case 'failed':
      return {
        tone: 'error',
        text: 'Nao foi possivel solicitar o reembolso agora. Confira o Mercado Pago e tente novamente.',
      };
    default:
      return null;
  }
}

export default async function AdminOrderPage({ params, searchParams }: AdminOrderPageProps) {
  const { number } = await params;
  const resolvedSearchParams = await searchParams;
  const order = await getOrderForAdmin(number);

  if (!order) {
    notFound();
  }

  const updateStatus = updateOrderStatusAction.bind(null, order.number);
  const refundPayment = refundOrderPaymentAction.bind(null, order.number);
  const availableStatuses = getAvailableOrderStatuses(order.status);
  const isTerminal = availableStatuses.length === 1;
  const isPaymentRefundable =
    order.status !== 'COMPLETED' &&
    order.paymentStatus === 'APPROVED' &&
    Boolean(order.mercadoPagoPaymentId);
  const refundMessage = getRefundMessage(resolvedSearchParams.refund);

  return (
    <section>
      <Link href="/admin/pedidos" className="text-sm font-semibold text-rose-300 hover:text-white">
        Voltar para pedidos
      </Link>
      {refundMessage ? (
        <div
          className={`mt-5 border px-4 py-3 text-sm ${
            refundMessage.tone === 'success'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
              : refundMessage.tone === 'info'
                ? 'border-sky-400/30 bg-sky-400/10 text-sky-100'
                : 'border-rose-400/30 bg-rose-400/10 text-rose-100'
          }`}
        >
          {refundMessage.text}
        </div>
      ) : null}
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
          <p className="text-sm font-semibold text-white">Pagamento</p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            {getPaymentStatusLabel(order.paymentStatus)}
            <br />
            Mercado Pago
            {order.mercadoPagoPaymentId ? (
              <>
                <br />
                ID: {order.mercadoPagoPaymentId}
              </>
            ) : null}
          </p>
          {order.paymentInitPoint ? (
            <Link
              href={order.paymentInitPoint}
              className="mt-3 inline-flex text-sm font-semibold text-rose-300 hover:text-white"
            >
              Abrir checkout
            </Link>
          ) : null}
          {order.paymentRefundId || order.paymentRefundStatus ? (
            <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-zinc-300">
              Reembolso
              {order.paymentRefundId ? (
                <>
                  <br />
                  ID: {order.paymentRefundId}
                </>
              ) : null}
              {order.paymentRefundStatus ? (
                <>
                  <br />
                  Status MP: {order.paymentRefundStatus}
                </>
              ) : null}
              {order.paymentRefundAmountInCents !== null ? (
                <>
                  <br />
                  Valor: {formatCents(order.paymentRefundAmountInCents)}
                </>
              ) : null}
            </p>
          ) : null}
          {isPaymentRefundable ? (
            <form action={refundPayment} className="mt-5 border-t border-white/10 pt-5">
              <label className="flex gap-3 text-sm leading-5 text-zinc-300">
                <input
                  name="confirmRefund"
                  type="checkbox"
                  value="yes"
                  required
                  className="mt-1 h-4 w-4 accent-rose-500"
                />
                Confirmo que desejo solicitar o reembolso total no Mercado Pago e cancelar ou
                manter cancelado o pedido no sistema.
              </label>
              <button
                type="submit"
                className="mt-4 w-full rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
              >
                Reembolsar e cancelar
              </button>
            </form>
          ) : null}

          <div className="mt-6 border-t border-white/10 pt-6">
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
          </div>
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
