import { createHash, randomBytes } from 'crypto';
import { getPrisma } from '@/lib/prisma';

export const customerAuthTokenTypes = {
  passwordReset: 'PASSWORD_RESET',
  verifyEmail: 'VERIFY_EMAIL',
} as const;

export type CustomerAuthTokenType =
  (typeof customerAuthTokenTypes)[keyof typeof customerAuthTokenTypes];

const tokenLifetimeMinutes: Record<CustomerAuthTokenType, number> = {
  PASSWORD_RESET: 30,
  VERIFY_EMAIL: 24 * 60,
};

export function hashCustomerAuthToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createCustomerAuthToken({
  userId,
  type,
  pendingPasswordHash,
}: {
  userId: string;
  type: CustomerAuthTokenType;
  pendingPasswordHash?: string;
}) {
  const prisma = getPrisma();
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashCustomerAuthToken(token);
  const expiresAt = new Date(
    Date.now() + tokenLifetimeMinutes[type] * 60 * 1000
  );

  await prisma.$transaction([
    prisma.customerAuthToken.deleteMany({
      where: { userId, type },
    }),
    prisma.customerAuthToken.create({
      data: {
        userId,
        type,
        tokenHash,
        pendingPasswordHash,
        expiresAt,
      },
    }),
  ]);

  return { token, tokenHash, expiresAt };
}
