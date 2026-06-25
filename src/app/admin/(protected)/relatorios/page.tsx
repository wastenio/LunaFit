import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Eye,
  Minus,
  MousePointerClick,
  Percent,
  Radio,
  ReceiptText,
  ShoppingCart,
  Users,
} from 'lucide-react';
import {
  analyticsPeriods,
  getAnalyticsDashboard,
  parseAnalyticsPeriod,
} from '@/features/analytics/analytics-data';
import { formatCents } from '@/lib/money';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Relatorios | LunaFit Admin',
};

type AnalyticsPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  change?: number | null;
  icon: React.ReactNode;
};

function MetricCard({
  label,
  value,
  detail,
  change,
  icon,
}: MetricCardProps) {
  const isPositive = (change ?? 0) > 0;
  const isNegative = (change ?? 0) < 0;

  return (
    <article className="rounded-md border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-white/10 text-rose-300">
          {icon}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        <span className="text-zinc-500">{detail}</span>
        {change === null ? (
          <span className="font-semibold text-emerald-300">Novo</span>
        ) : typeof change === 'number' ? (
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              isPositive
                ? 'text-emerald-300'
                : isNegative
                  ? 'text-red-300'
                  : 'text-zinc-400'
            }`}
          >
            {isPositive ? (
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            ) : isNegative ? (
              <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Minus aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {Math.abs(change)}%
          </span>
        ) : null}
      </div>
    </article>
  );
}

function formatSource(source: string) {
  if (source === 'direct') {
    return 'Acesso direto';
  }

  const labels: Record<string, string> = {
    'google.com': 'Google',
    'instagram.com': 'Instagram',
    'facebook.com': 'Facebook',
    't.co': 'X / Twitter',
  };

  return labels[source] ?? source;
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = parseAnalyticsPeriod(resolvedSearchParams?.period);
  const dashboard = await getAnalyticsDashboard(period);
  const { metrics } = dashboard;
  const maxTraffic = Math.max(
    1,
    ...dashboard.trafficSeries.map((item) => item.pageViews)
  );
  const maxSourceViews = Math.max(
    1,
    ...dashboard.sources.map((source) => source.views)
  );
  const funnelBase = Math.max(1, dashboard.funnel[0]?.value ?? 0);

  return (
    <section>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-300">
            Desempenho
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Visao do negocio
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Trafego, interesse e vendas da loja.
          </p>
        </div>
        <nav
          aria-label="Periodo dos relatorios"
          className="inline-flex w-fit rounded-md border border-white/10 bg-white/[0.04] p-1"
        >
          {analyticsPeriods.map((days) => (
            <Link
              key={days}
              href={`/admin/relatorios?period=${days}`}
              className={`rounded px-4 py-2 text-sm font-semibold transition ${
                period === days
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {days} dias
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Visualizacoes"
          value={metrics.pageViews.toLocaleString('pt-BR')}
          detail="Paginas acessadas"
          change={metrics.changes.pageViews}
          icon={<Eye aria-hidden="true" className="h-5 w-5" />}
        />
        <MetricCard
          label="Visitantes"
          value={metrics.visitors.toLocaleString('pt-BR')}
          detail={`${metrics.sessions.toLocaleString('pt-BR')} sessoes`}
          change={metrics.changes.visitors}
          icon={<Users aria-hidden="true" className="h-5 w-5" />}
        />
        <MetricCard
          label="Pedidos"
          value={metrics.orderCount.toLocaleString('pt-BR')}
          detail={`${metrics.cartAdditions.toLocaleString('pt-BR')} adicoes ao carrinho`}
          change={metrics.changes.orders}
          icon={<ShoppingCart aria-hidden="true" className="h-5 w-5" />}
        />
        <MetricCard
          label="Valor em pedidos"
          value={formatCents(metrics.revenueInCents)}
          detail={`Ticket medio ${formatCents(metrics.averageOrderInCents)}`}
          change={metrics.changes.revenue}
          icon={<CircleDollarSign aria-hidden="true" className="h-5 w-5" />}
        />
        <MetricCard
          label="Conversao"
          value={`${metrics.conversionRate.toFixed(1).replace('.', ',')}%`}
          detail="Pedidos por sessao"
          icon={<Percent aria-hidden="true" className="h-5 w-5" />}
        />
        <MetricCard
          label="Interesse"
          value={metrics.cartAdditions.toLocaleString('pt-BR')}
          detail="Produtos adicionados"
          icon={<MousePointerClick aria-hidden="true" className="h-5 w-5" />}
        />
        <MetricCard
          label="Sessoes"
          value={metrics.sessions.toLocaleString('pt-BR')}
          detail="Visitas iniciadas"
          change={metrics.changes.sessions}
          icon={<ReceiptText aria-hidden="true" className="h-5 w-5" />}
        />
        <MetricCard
          label="Ativos agora"
          value={metrics.activeVisitors.toLocaleString('pt-BR')}
          detail="Ultimos 5 minutos"
          icon={<Radio aria-hidden="true" className="h-5 w-5" />}
        />
      </div>

      <section className="mt-10 border-y border-white/10 py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Evolucao do trafego</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Visualizacoes e visitantes por periodo.
            </p>
          </div>
          <div className="flex gap-4 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-rose-500" />
              Visualizacoes
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-emerald-400" />
              Visitantes
            </span>
          </div>
        </div>

        <div className="mt-7 overflow-x-auto pb-2">
          <div className="flex h-52 min-w-[680px] items-end gap-2 sm:h-64">
            {dashboard.trafficSeries.map((item, index) => (
              <div
                key={item.key}
                className="flex h-full min-w-5 flex-1 flex-col justify-end"
                role="img"
                aria-label={`${item.label}: ${item.pageViews} visualizacoes e ${item.visitors} visitantes`}
                title={`${item.label}: ${item.pageViews} visualizacoes, ${item.visitors} visitantes`}
              >
                <div className="flex h-[150px] items-end justify-center gap-1 sm:h-[210px]">
                  <span
                    className="w-2/5 min-w-1 bg-rose-500 transition-all"
                    style={{
                      height: `${Math.max(
                        item.pageViews > 0 ? 5 : 0,
                        (item.pageViews / maxTraffic) * 100
                      )}%`,
                    }}
                  />
                  <span
                    className="w-2/5 min-w-1 bg-emerald-400 transition-all"
                    style={{
                      height: `${Math.max(
                        item.visitors > 0 ? 5 : 0,
                        (item.visitors / maxTraffic) * 100
                      )}%`,
                    }}
                  />
                </div>
                <span className="mt-2 truncate text-center text-[10px] text-zinc-500">
                  {period !== 30 ||
                  index % 5 === 0 ||
                  index === dashboard.trafficSeries.length - 1
                    ? item.label
                    : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-10 border-b border-white/10 py-9 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold text-white">Funil de compra</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pedidos realizados confirmam automaticamente as etapas anteriores.
          </p>
          <div className="mt-6 space-y-5">
            {dashboard.funnel.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-zinc-300">{item.label}</span>
                  <span className="font-semibold text-white">
                    {item.value.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-white/10">
                  <div
                    className="h-full bg-rose-500"
                    style={{
                      width: `${Math.min(100, (item.value / funnelBase) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">Origem dos acessos</h2>
          {dashboard.sources.length > 0 ? (
            <div className="mt-6 space-y-5">
              {dashboard.sources.map((source) => (
                <div key={source.source}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="truncate text-zinc-300">
                      {formatSource(source.source)}
                    </span>
                    <span className="text-zinc-400">
                      {source.views} acessos
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-white/10">
                    <div
                      className="h-full bg-emerald-400"
                      style={{
                        width: `${(source.views / maxSourceViews) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-zinc-500">
              As origens aparecerao conforme novos acessos forem registrados.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-10 py-9 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold text-white">Paginas mais acessadas</h2>
          {dashboard.topPages.length > 0 ? (
            <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
              {dashboard.topPages.map((page, index) => (
                <div
                  key={page.path}
                  className="grid grid-cols-[32px_1fr_auto] items-center gap-3 py-4"
                >
                  <span className="text-sm font-semibold text-zinc-500">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{page.label}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">{page.path}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-white">{page.views}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {page.visitors} visitantes
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-zinc-500">
              Nenhuma visualizacao registrada neste periodo.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">Produtos com mais interesse</h2>
          {dashboard.topProducts.length > 0 ? (
            <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
              {dashboard.topProducts.map((product) => (
                <div
                  key={product.slug}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{product.name}</p>
                    <Link
                      href={`/produtos/${product.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex text-xs text-rose-300 hover:text-white"
                    >
                      Ver produto
                    </Link>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-white">{product.views}</p>
                    <p className="mt-1 text-xs text-zinc-500">visualizacoes</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-white">
                      {product.cartAdditions}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">no carrinho</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-zinc-500">
              O interesse aparecera quando os produtos receberem acessos.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
