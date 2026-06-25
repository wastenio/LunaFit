import { NextRequest, NextResponse } from 'next/server';
import {
  createAnalyticsIdentity,
  recordAnalyticsEvent,
  setAnalyticsCookies,
  shouldIgnoreAnalyticsRequest,
} from '@/features/analytics/analytics-server';
import { getCustomerSession } from '@/lib/customer-auth';
import { getPrisma } from '@/lib/prisma';

type PageViewBody = {
  path?: unknown;
  search?: unknown;
  referrer?: unknown;
};

function skipped(reason: string) {
  return new NextResponse(null, {
    headers: { 'X-Analytics-Skip': reason },
    status: 204,
  });
}

function cleanValue(value: string | null, maxLength = 100) {
  const cleaned = value?.trim().slice(0, maxLength) ?? '';
  return cleaned || null;
}

function decodePathSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

function getTrafficSource(
  request: NextRequest,
  search: string,
  referrer: string
) {
  const searchParams = new URLSearchParams(search.startsWith('?') ? search : '');
  const campaign = cleanValue(searchParams.get('utm_campaign'));
  const utmSource = cleanValue(searchParams.get('utm_source'));
  const utmMedium = cleanValue(searchParams.get('utm_medium'));

  if (utmSource) {
    return {
      source: utmSource.toLowerCase(),
      medium: utmMedium?.toLowerCase() ?? 'campaign',
      campaign,
    };
  }

  if (referrer) {
    try {
      const referrerUrl = new URL(referrer);

      if (referrerUrl.host !== request.nextUrl.host) {
        return {
          source: referrerUrl.hostname.replace(/^www\./, '').toLowerCase(),
          medium: 'referral',
          campaign: null,
        };
      }
    } catch {
      // Invalid referrers are treated as direct traffic.
    }
  }

  return {
    source: 'direct',
    medium: 'none',
    campaign: null,
  };
}

export async function POST(request: NextRequest) {
  if (shouldIgnoreAnalyticsRequest(request)) {
    return skipped('privacy-or-bot');
  }

  const origin = request.headers.get('origin');
  const requestHost = request.headers.get('host') ?? request.nextUrl.host;

  if (origin) {
    try {
      if (new URL(origin).host !== requestHost) {
        return skipped('cross-origin');
      }
    } catch {
      return skipped('cross-origin');
    }
  }

  const body = (await request.json().catch(() => null)) as PageViewBody | null;
  const path = typeof body?.path === 'string' ? body.path.trim().slice(0, 300) : '';

  if (
    !path.startsWith('/') ||
    path.startsWith('/admin') ||
    path.startsWith('/api') ||
    path.startsWith('/_next')
  ) {
    return skipped('invalid-path');
  }

  const search = typeof body?.search === 'string' ? body.search.slice(0, 500) : '';
  const referrer =
    typeof body?.referrer === 'string' ? body.referrer.slice(0, 500) : '';
  const identity = createAnalyticsIdentity(request);
  const customerSession = await getCustomerSession();
  const duplicateThreshold = new Date(Date.now() - 10_000);
  const duplicate = await getPrisma().analyticsEvent.findFirst({
    select: { id: true, userId: true },
    where: {
      type: 'PAGE_VIEW',
      sessionId: identity.sessionId,
      path,
      createdAt: { gte: duplicateThreshold },
    },
  });
  const response = NextResponse.json({ recorded: !duplicate });

  setAnalyticsCookies(response, identity);

  if (duplicate) {
    if (customerSession && !duplicate.userId) {
      await getPrisma().analyticsEvent.update({
        data: { userId: customerSession.user.id },
        where: { id: duplicate.id },
      });
    }

    return response;
  }

  const productSlug = path.match(/^\/produtos\/([^/]+)$/)?.[1];
  const product = productSlug
    ? await getPrisma().product.findUnique({
        select: { id: true },
        where: { slug: decodePathSegment(productSlug) },
      })
    : null;
  let traffic = getTrafficSource(request, search, referrer);

  if (traffic.source === 'direct') {
    const sessionSource = await getPrisma().analyticsEvent.findFirst({
      orderBy: { createdAt: 'asc' },
      select: {
        source: true,
        medium: true,
        campaign: true,
      },
      where: {
        type: 'PAGE_VIEW',
        sessionId: identity.sessionId,
        source: { not: 'direct' },
      },
    });

    if (sessionSource?.source) {
      traffic = {
        source: sessionSource.source,
        medium: sessionSource.medium ?? 'referral',
        campaign: sessionSource.campaign,
      };
    }
  }

  await recordAnalyticsEvent({
    ...identity,
    type: 'PAGE_VIEW',
    userId: customerSession?.user.id,
    path,
    productId: product?.id,
    ...traffic,
  });

  return response;
}
