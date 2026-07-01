import { getPrisma } from '@/lib/prisma';

export const analyticsPeriods = [7, 30, 90] as const;
export type AnalyticsPeriod = (typeof analyticsPeriods)[number];

const FORTALEZA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseAnalyticsPeriod(value?: string): AnalyticsPeriod {
  const period = Number(value);

  return analyticsPeriods.includes(period as AnalyticsPeriod)
    ? (period as AnalyticsPeriod)
    : 30;
}

function getFortalezaDateKey(date: Date) {
  return new Date(date.getTime() - FORTALEZA_UTC_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

function getPeriodStart(days: number, now: Date) {
  const localNow = new Date(now.getTime() - FORTALEZA_UTC_OFFSET_MS);

  return new Date(
    Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate() - days + 1,
      3
    )
  );
}

function getChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function uniqueCount(values: string[]) {
  return new Set(values).size;
}

function formatPathLabel(path: string) {
  const labels: Record<string, string> = {
    '/': 'Pagina inicial',
    '/produtos': 'Catalogo',
    '/contato': 'Contato',
    '/login': 'Login',
    '/carrinho': 'Carrinho',
    '/checkout': 'Finalizacao',
    '/minha-conta': 'Minha conta',
    '/notificacoes': 'Notificacoes',
  };

  if (labels[path]) {
    return labels[path];
  }

  if (path.startsWith('/pedidos/')) {
    return 'Acompanhamento de pedido';
  }

  return path;
}

export async function getAnalyticsDashboard(period: AnalyticsPeriod) {
  const now = new Date();
  const currentStart = getPeriodStart(period, now);
  const previousStart = new Date(currentStart.getTime() - period * DAY_MS);
  const activeSince = new Date(now.getTime() - 5 * 60 * 1000);
  const prisma = getPrisma();

  const [events, orders] = await Promise.all([
    prisma.analyticsEvent.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        type: true,
        visitorId: true,
        sessionId: true,
        userId: true,
        path: true,
        source: true,
        productId: true,
        createdAt: true,
        product: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      where: {
        createdAt: { gte: previousStart },
      },
    }),
    prisma.order.findMany({
      select: {
        paymentStatus: true,
        userId: true,
        status: true,
        totalInCents: true,
        createdAt: true,
      },
      where: {
        createdAt: { gte: previousStart },
      },
    }),
  ]);

  const currentEvents = events.filter((event) => event.createdAt >= currentStart);
  const previousEvents = events.filter((event) => event.createdAt < currentStart);
  const currentPageViews = currentEvents.filter((event) => event.type === 'PAGE_VIEW');
  const previousPageViews = previousEvents.filter((event) => event.type === 'PAGE_VIEW');
  const currentOrders = orders.filter(
    (order) =>
      order.createdAt >= currentStart &&
      order.status !== 'CANCELLED' &&
      order.paymentStatus === 'APPROVED'
  );
  const previousOrders = orders.filter(
    (order) =>
      order.createdAt < currentStart &&
      order.status !== 'CANCELLED' &&
      order.paymentStatus === 'APPROVED'
  );
  const pageViews = currentPageViews.length;
  const previousPageViewCount = previousPageViews.length;
  const visitors = uniqueCount(currentPageViews.map((event) => event.visitorId));
  const previousVisitors = uniqueCount(
    previousPageViews.map((event) => event.visitorId)
  );
  const sessions = uniqueCount(currentPageViews.map((event) => event.sessionId));
  const previousSessions = uniqueCount(
    previousPageViews.map((event) => event.sessionId)
  );
  const orderCount = currentOrders.length;
  const previousOrderCount = previousOrders.length;
  const revenueInCents = currentOrders.reduce(
    (total, order) => total + order.totalInCents,
    0
  );
  const previousRevenueInCents = previousOrders.reduce(
    (total, order) => total + order.totalInCents,
    0
  );
  const trackedCartAdditions = currentEvents.filter(
    (event) => event.type === 'ADD_TO_CART'
  ).length;
  const buyerCount = uniqueCount(currentOrders.map((order) => order.userId));
  const cartAdditions = Math.max(trackedCartAdditions, buyerCount);
  const activeVisitors = uniqueCount(
    currentPageViews
      .filter((event) => event.createdAt >= activeSince)
      .map((event) => event.visitorId)
  );
  const conversionBase = Math.max(sessions, buyerCount);
  const conversionRate =
    conversionBase > 0 ? (buyerCount / conversionBase) * 100 : 0;
  const averageOrderInCents =
    orderCount > 0 ? Math.round(revenueInCents / orderCount) : 0;

  const bucketSizeInDays = period === 90 ? 7 : 1;
  const bucketCount = Math.ceil(period / bucketSizeInDays);
  const trafficSeries = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(
      currentStart.getTime() + index * bucketSizeInDays * DAY_MS
    );
    const bucketEnd = new Date(
      Math.min(
        bucketStart.getTime() + bucketSizeInDays * DAY_MS,
        now.getTime() + 1
      )
    );
    const bucketEvents = currentPageViews.filter(
      (event) => event.createdAt >= bucketStart && event.createdAt < bucketEnd
    );
    const startLabel = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'America/Fortaleza',
    }).format(bucketStart);
    const endLabel = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'America/Fortaleza',
    }).format(new Date(bucketEnd.getTime() - 1));

    return {
      key: getFortalezaDateKey(bucketStart),
      label: bucketSizeInDays === 1 ? startLabel : `${startLabel} - ${endLabel}`,
      pageViews: bucketEvents.length,
      visitors: uniqueCount(bucketEvents.map((event) => event.visitorId)),
    };
  });

  const pageMap = new Map<
    string,
    { label: string; path: string; views: number; visitors: Set<string> }
  >();

  for (const event of currentPageViews) {
    if (!event.path) {
      continue;
    }

    const existing = pageMap.get(event.path) ?? {
      label: event.product?.name ?? formatPathLabel(event.path),
      path: event.path,
      views: 0,
      visitors: new Set<string>(),
    };
    existing.views += 1;
    existing.visitors.add(event.visitorId);
    pageMap.set(event.path, existing);
  }

  const topPages = Array.from(pageMap.values())
    .sort((left, right) => right.views - left.views)
    .slice(0, 8)
    .map((page) => ({
      label: page.label,
      path: page.path,
      views: page.views,
      visitors: page.visitors.size,
    }));

  const productMap = new Map<
    number,
    {
      name: string;
      slug: string;
      views: number;
      cartAdditions: number;
      visitors: Set<string>;
    }
  >();

  for (const event of currentEvents) {
    if (!event.productId || !event.product) {
      continue;
    }

    const product = productMap.get(event.productId) ?? {
      name: event.product.name,
      slug: event.product.slug,
      views: 0,
      cartAdditions: 0,
      visitors: new Set<string>(),
    };

    if (event.type === 'PAGE_VIEW') {
      product.views += 1;
      product.visitors.add(event.visitorId);
    }

    if (event.type === 'ADD_TO_CART') {
      product.cartAdditions += 1;
    }

    productMap.set(event.productId, product);
  }

  const topProducts = Array.from(productMap.values())
    .sort(
      (left, right) =>
        right.views + right.cartAdditions * 3 -
        (left.views + left.cartAdditions * 3)
    )
    .slice(0, 6)
    .map((product) => ({
      ...product,
      visitors: product.visitors.size,
      interestRate:
        product.views > 0 ? (product.cartAdditions / product.views) * 100 : 0,
    }));

  const sourceMap = new Map<
    string,
    { views: number; visitors: Set<string> }
  >();

  for (const event of currentPageViews) {
    const source = event.source || 'direct';
    const current = sourceMap.get(source) ?? {
      views: 0,
      visitors: new Set<string>(),
    };
    current.views += 1;
    current.visitors.add(event.visitorId);
    sourceMap.set(source, current);
  }

  const sources = Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      views: data.views,
      visitors: data.visitors.size,
    }))
    .sort((left, right) => right.views - left.views)
    .slice(0, 6);

  const visitorIds = new Set(currentPageViews.map((event) => event.visitorId));
  const productActors = new Set(
    currentPageViews
      .filter((event) => event.productId)
      .map((event) =>
        event.userId ? `user:${event.userId}` : `visitor:${event.visitorId}`
      )
  );
  const cartActors = new Set(
    currentEvents
      .filter((event) => event.type === 'ADD_TO_CART')
      .map((event) =>
        event.userId ? `user:${event.userId}` : `visitor:${event.visitorId}`
      )
  );
  const productInterestCount = Math.max(
    productActors.size,
    cartActors.size,
    buyerCount
  );
  const cartInterestCount = Math.max(cartActors.size, buyerCount);
  const funnelVisitorCount = Math.max(visitorIds.size, productInterestCount);

  return {
    period,
    metrics: {
      pageViews,
      visitors,
      sessions,
      activeVisitors,
      cartAdditions,
      orderCount,
      revenueInCents,
      averageOrderInCents,
      conversionRate,
      changes: {
        pageViews: getChange(pageViews, previousPageViewCount),
        visitors: getChange(visitors, previousVisitors),
        sessions: getChange(sessions, previousSessions),
        orders: getChange(orderCount, previousOrderCount),
        revenue: getChange(revenueInCents, previousRevenueInCents),
      },
    },
    trafficSeries,
    topPages,
    topProducts,
    sources,
    funnel: [
      { label: 'Visitantes', value: funnelVisitorCount },
      { label: 'Viram produtos', value: productInterestCount },
      { label: 'Adicionaram ao carrinho', value: cartInterestCount },
      { label: 'Compraram', value: buyerCount },
    ],
  };
}
