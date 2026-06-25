import { randomUUID } from 'crypto';
import type { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const ANALYTICS_VISITOR_COOKIE = 'lunafit_visitor_id';
export const ANALYTICS_SESSION_COOKIE = 'lunafit_analytics_session';

const VISITOR_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const SESSION_MAX_AGE_SECONDS = 60 * 30;
const ANALYTICS_ID_PATTERN = /^[a-f0-9-]{20,40}$/i;

export type AnalyticsEventType = 'PAGE_VIEW' | 'ADD_TO_CART' | 'PURCHASE';

export type AnalyticsIdentity = {
  visitorId: string;
  sessionId: string;
};

function parseCookies(cookieHeader: string) {
  return new Map(
    cookieHeader
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separatorIndex = item.indexOf('=');
        const name = separatorIndex >= 0 ? item.slice(0, separatorIndex) : item;
        const value = separatorIndex >= 0 ? item.slice(separatorIndex + 1) : '';

        try {
          return [name, decodeURIComponent(value)] as const;
        } catch {
          return [name, ''] as const;
        }
      })
  );
}

function getValidAnalyticsId(value?: string) {
  return value && ANALYTICS_ID_PATTERN.test(value) ? value : null;
}

export function readAnalyticsIdentity(request: Request): AnalyticsIdentity | null {
  const cookies = parseCookies(request.headers.get('cookie') ?? '');
  const visitorId = getValidAnalyticsId(cookies.get(ANALYTICS_VISITOR_COOKIE));
  const sessionId = getValidAnalyticsId(cookies.get(ANALYTICS_SESSION_COOKIE));

  return visitorId && sessionId ? { visitorId, sessionId } : null;
}

export function createAnalyticsIdentity(request: Request): AnalyticsIdentity {
  const cookies = parseCookies(request.headers.get('cookie') ?? '');

  return {
    visitorId:
      getValidAnalyticsId(cookies.get(ANALYTICS_VISITOR_COOKIE)) ?? randomUUID(),
    sessionId:
      getValidAnalyticsId(cookies.get(ANALYTICS_SESSION_COOKIE)) ?? randomUUID(),
  };
}

export function setAnalyticsCookies(
  response: NextResponse,
  identity: AnalyticsIdentity
) {
  const cookieOptions = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };

  response.cookies.set(ANALYTICS_VISITOR_COOKIE, identity.visitorId, {
    ...cookieOptions,
    maxAge: VISITOR_MAX_AGE_SECONDS,
  });
  response.cookies.set(ANALYTICS_SESSION_COOKIE, identity.sessionId, {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

type RecordAnalyticsEventInput = AnalyticsIdentity & {
  type: AnalyticsEventType;
  userId?: string | null;
  path?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  productId?: number | null;
  orderId?: number | null;
  valueInCents?: number | null;
};

export async function recordAnalyticsEvent(input: RecordAnalyticsEventInput) {
  return getPrisma().analyticsEvent.create({
    data: {
      type: input.type,
      visitorId: input.visitorId,
      sessionId: input.sessionId,
      userId: input.userId,
      path: input.path,
      source: input.source,
      medium: input.medium,
      campaign: input.campaign,
      productId: input.productId,
      orderId: input.orderId,
      valueInCents: input.valueInCents,
    },
  });
}

export function shouldIgnoreAnalyticsRequest(request: Request) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() ?? '';
  const botPattern =
    /bot|crawler|spider|preview|facebookexternalhit|whatsapp|slurp/i;

  return (
    request.headers.get('dnt') === '1' ||
    request.headers.get('sec-gpc') === '1' ||
    botPattern.test(userAgent)
  );
}
