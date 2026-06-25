'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { isGoogleAuthConfigured, signIn, signOut } from '@/auth';
import { getPrisma } from '@/lib/prisma';
import {
  createCustomerAuthToken,
  customerAuthTokenTypes,
  hashCustomerAuthToken,
} from './auth-token';
import {
  getAuthActionUrl,
  isCustomerEmailConfigured,
  sendAuthEmail,
} from './email';
import { hashPassword, validatePassword } from './password';

function safeRedirect(value: FormDataEntryValue | null) {
  const path = typeof value === 'string' ? value.trim() : '';

  return path.startsWith('/') && !path.startsWith('//') ? path : '/';
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function cleanName(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function redirectWithParams(
  path: string,
  params: Record<string, string | undefined>
): never {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  redirect(`${path}?${searchParams.toString()}`);
}

export async function loginWithGoogleAction(formData: FormData) {
  const redirectTo = safeRedirect(formData.get('callbackUrl'));

  if (!isGoogleAuthConfigured()) {
    redirect(`/login?error=config&callbackUrl=${encodeURIComponent(redirectTo)}`);
  }

  try {
    await signIn('google', { redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=oauth&callbackUrl=${encodeURIComponent(redirectTo)}`);
    }

    throw error;
  }
}

export async function loginWithPasswordAction(formData: FormData) {
  const redirectTo = safeRedirect(formData.get('callbackUrl'));
  const email = normalizeEmail(formData.get('email'));
  const password = String(formData.get('password') ?? '');

  if (!isValidEmail(email) || !password) {
    redirectWithParams('/login', {
      callbackUrl: redirectTo,
      error: 'credentials',
    });
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirectWithParams('/login', {
        callbackUrl: redirectTo,
        error: 'credentials',
      });
    }

    throw error;
  }
}

export async function registerCustomerAction(formData: FormData) {
  const redirectTo = safeRedirect(formData.get('callbackUrl'));
  const name = cleanName(formData.get('name'));
  const email = normalizeEmail(formData.get('email'));
  const password = String(formData.get('password') ?? '');
  const passwordConfirmation = String(formData.get('passwordConfirmation') ?? '');

  if (name.length < 2 || name.length > 80) {
    redirectWithParams('/cadastro', {
      callbackUrl: redirectTo,
      error: 'name',
    });
  }

  if (!isValidEmail(email)) {
    redirectWithParams('/cadastro', {
      callbackUrl: redirectTo,
      error: 'email',
    });
  }

  const passwordValidation = validatePassword(password);

  if (!passwordValidation.success) {
    redirectWithParams('/cadastro', {
      callbackUrl: redirectTo,
      error: 'password',
    });
  }

  if (password !== passwordConfirmation) {
    redirectWithParams('/cadastro', {
      callbackUrl: redirectTo,
      error: 'confirmation',
    });
  }

  if (!isCustomerEmailConfigured()) {
    redirectWithParams('/cadastro', {
      callbackUrl: redirectTo,
      error: 'email-config',
    });
  }

  const prisma = getPrisma();
  const existingUser = await prisma.user.findUnique({
    select: {
      id: true,
      emailVerified: true,
      passwordHash: true,
    },
    where: { email },
  });

  if (existingUser?.emailVerified && existingUser.passwordHash) {
    redirectWithParams('/login', {
      callbackUrl: redirectTo,
      status: 'account-exists',
    });
  }

  const pendingPasswordHash = await hashPassword(password);
  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        name,
        email,
      },
      select: { id: true },
    }));
  const authToken = await createCustomerAuthToken({
    userId: user.id,
    type: customerAuthTokenTypes.verifyEmail,
    pendingPasswordHash,
  });

  try {
    await sendAuthEmail({
      to: email,
      subject: 'Confirme seu cadastro na LunaFit',
      title: `Confirme seu email${name ? `, ${name.split(' ')[0]}` : ''}`,
      message:
        'Clique no botao abaixo para confirmar seu email e ativar o acesso por senha. Este link e valido por 24 horas.',
      actionLabel: 'Confirmar meu email',
      actionUrl: getAuthActionUrl('/verificar-email', authToken.token),
      idempotencyKey: `verify-email-${authToken.tokenHash}`,
    });
  } catch {
    await prisma.customerAuthToken.deleteMany({
      where: { tokenHash: authToken.tokenHash },
    });
    redirectWithParams('/cadastro', {
      callbackUrl: redirectTo,
      error: 'email-send',
    });
  }

  redirectWithParams('/verificar-email', {
    callbackUrl: redirectTo,
    status: 'sent',
  });
}

export async function requestEmailVerificationAction(formData: FormData) {
  const email = normalizeEmail(formData.get('email'));

  if (!isValidEmail(email)) {
    redirect('/verificar-email?status=resent');
  }

  if (!isCustomerEmailConfigured()) {
    redirect('/verificar-email?error=email-config');
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    select: {
      id: true,
      name: true,
      emailVerified: true,
      passwordHash: true,
    },
    where: { email },
  });

  if (!user || (user.emailVerified && user.passwordHash)) {
    redirect('/verificar-email?status=resent');
  }

  const previousToken = await prisma.customerAuthToken.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { pendingPasswordHash: true },
    where: {
      userId: user.id,
      type: customerAuthTokenTypes.verifyEmail,
      expiresAt: { gt: new Date() },
    },
  });
  const pendingPasswordHash =
    previousToken?.pendingPasswordHash ?? user.passwordHash;

  if (!pendingPasswordHash) {
    redirect('/verificar-email?status=resent');
  }

  const token = await createCustomerAuthToken({
    userId: user.id,
    type: customerAuthTokenTypes.verifyEmail,
    pendingPasswordHash,
  });

  try {
    await sendAuthEmail({
      to: email,
      subject: 'Confirme seu email na LunaFit',
      title: 'Confirme seu email',
      message:
        'Use o botao abaixo para confirmar seu email. O link e valido por 24 horas.',
      actionLabel: 'Confirmar meu email',
      actionUrl: getAuthActionUrl('/verificar-email', token.token),
      idempotencyKey: `verify-email-${token.tokenHash}`,
    });
  } catch {
    await prisma.customerAuthToken.deleteMany({
      where: { tokenHash: token.tokenHash },
    });
    redirect('/verificar-email?error=email-send');
  }

  redirect('/verificar-email?status=resent');
}

export async function verifyCustomerEmailAction(formData: FormData) {
  const token = String(formData.get('token') ?? '');
  const callbackUrl = safeRedirect(formData.get('callbackUrl'));

  if (token.length < 32) {
    redirect('/verificar-email?error=invalid');
  }

  const prisma = getPrisma();
  const tokenHash = hashCustomerAuthToken(token);
  const storedToken = await prisma.customerAuthToken.findUnique({
    select: {
      id: true,
      userId: true,
      type: true,
      pendingPasswordHash: true,
      expiresAt: true,
    },
    where: { tokenHash },
  });

  if (
    !storedToken ||
    storedToken.type !== customerAuthTokenTypes.verifyEmail ||
    storedToken.expiresAt <= new Date() ||
    !storedToken.pendingPasswordHash
  ) {
    await prisma.customerAuthToken.deleteMany({ where: { tokenHash } });
    redirect('/verificar-email?error=invalid');
  }

  await prisma.$transaction([
    prisma.user.update({
      data: {
        emailVerified: new Date(),
        passwordHash: storedToken.pendingPasswordHash,
      },
      where: { id: storedToken.userId },
    }),
    prisma.customerAuthToken.deleteMany({
      where: {
        userId: storedToken.userId,
        type: customerAuthTokenTypes.verifyEmail,
      },
    }),
  ]);

  redirectWithParams('/login', {
    callbackUrl,
    status: 'verified',
  });
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = normalizeEmail(formData.get('email'));

  if (!isCustomerEmailConfigured()) {
    redirect('/esqueci-senha?error=email-config');
  }

  const prisma = getPrisma();
  const user = isValidEmail(email)
    ? await prisma.user.findUnique({
        select: { id: true, name: true },
        where: { email },
      })
    : null;

  if (user) {
    const token = await createCustomerAuthToken({
      userId: user.id,
      type: customerAuthTokenTypes.passwordReset,
    });

    try {
      await sendAuthEmail({
        to: email,
        subject: 'Redefina sua senha da LunaFit',
        title: 'Redefinicao de senha',
        message:
          'Recebemos uma solicitacao para redefinir sua senha. Este link e valido por 30 minutos.',
        actionLabel: 'Criar nova senha',
        actionUrl: getAuthActionUrl('/redefinir-senha', token.token),
        idempotencyKey: `password-reset-${token.tokenHash}`,
      });
    } catch {
      await prisma.customerAuthToken.deleteMany({
        where: { tokenHash: token.tokenHash },
      });
      redirect('/esqueci-senha?error=email-send');
    }
  }

  redirect('/esqueci-senha?status=sent');
}

export async function resetCustomerPasswordAction(formData: FormData) {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const passwordConfirmation = String(formData.get('passwordConfirmation') ?? '');
  const passwordValidation = validatePassword(password);

  if (!passwordValidation.success) {
    redirectWithParams('/redefinir-senha', {
      token,
      error: 'password',
    });
  }

  if (password !== passwordConfirmation) {
    redirectWithParams('/redefinir-senha', {
      token,
      error: 'confirmation',
    });
  }

  const prisma = getPrisma();
  const tokenHash = hashCustomerAuthToken(token);
  const storedToken = await prisma.customerAuthToken.findUnique({
    select: {
      userId: true,
      type: true,
      expiresAt: true,
    },
    where: { tokenHash },
  });

  if (
    !storedToken ||
    storedToken.type !== customerAuthTokenTypes.passwordReset ||
    storedToken.expiresAt <= new Date()
  ) {
    await prisma.customerAuthToken.deleteMany({ where: { tokenHash } });
    redirect('/redefinir-senha?error=invalid');
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      data: {
        passwordHash,
        emailVerified: new Date(),
        authVersion: { increment: 1 },
      },
      where: { id: storedToken.userId },
    }),
    prisma.customerAuthToken.deleteMany({
      where: {
        userId: storedToken.userId,
        type: customerAuthTokenTypes.passwordReset,
      },
    }),
    prisma.session.deleteMany({
      where: { userId: storedToken.userId },
    }),
  ]);

  redirect('/login?status=password-reset');
}

export async function logoutCustomerAction() {
  await signOut({ redirectTo: '/' });
}
