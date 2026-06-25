import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const ADMIN_SESSION_COOKIE = 'lunafit_admin_session';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  role: 'admin';
  exp: number;
};

type LoginResult = 'ok' | 'missing-config' | 'invalid';

function getAuthSecret() {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || '';
}

function sign(value: string) {
  return createHmac('sha256', getAuthSecret()).update(value).digest('base64url');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function constantTimePasswordMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  return inputBuffer.length === expectedBuffer.length && timingSafeEqual(inputBuffer, expectedBuffer);
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(value: string): SessionPayload | null {
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const payload = JSON.parse(decoded) as Partial<SessionPayload>;

    if (payload.role !== 'admin' || typeof payload.exp !== 'number') {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

function createSessionValue() {
  const payload = encodePayload({
    role: 'admin',
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });

  return `${payload}.${sign(payload)}`;
}

export function isAdminSessionValid(value?: string) {
  const secret = getAuthSecret();

  if (!value || !secret) {
    return false;
  }

  const [payloadValue, signature, ...rest] = value.split('.');

  if (!payloadValue || !signature || rest.length > 0 || !safeEqual(signature, sign(payloadValue))) {
    return false;
  }

  const payload = decodePayload(payloadValue);

  return Boolean(payload && payload.exp > Date.now());
}

export function isAdminRequest(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const session = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.split('=')
    .slice(1)
    .join('=');

  return isAdminSessionValid(session ? decodeURIComponent(session) : undefined);
}

export async function requireAdmin() {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;

  if (!isAdminSessionValid(session)) {
    redirect('/admin/login');
  }
}

export async function createAdminSession(password: string): Promise<LoginResult> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || !getAuthSecret()) {
    return 'missing-config';
  }

  if (!constantTimePasswordMatch(password, adminPassword)) {
    return 'invalid';
  }

  (await cookies()).set(ADMIN_SESSION_COOKIE, createSessionValue(), {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return 'ok';
}

export async function clearAdminSession() {
  (await cookies()).set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}
