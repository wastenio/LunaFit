import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const counters = [
  ['products', () => prisma.product.count()],
  ['users', () => prisma.user.count()],
  ['accounts', () => prisma.account.count()],
  ['sessions', () => prisma.session.count()],
  ['verificationTokens', () => prisma.verificationToken.count()],
  ['authenticators', () => prisma.authenticator.count()],
  ['cartItems', () => prisma.cartItem.count()],
  ['orders', () => prisma.order.count()],
  ['orderItems', () => prisma.orderItem.count()],
  ['orderStatusEvents', () => prisma.orderStatusEvent.count()],
  ['customerNotifications', () => prisma.customerNotification.count()],
  ['analyticsEvents', () => prisma.analyticsEvent.count()],
  ['customerAuthTokens', () => prisma.customerAuthToken.count()],
];

async function verifyData() {
  const entries = await Promise.all(
    counters.map(async ([name, count]) => [name, await count()])
  );

  console.log(JSON.stringify(Object.fromEntries(entries), null, 2));
}

verifyData()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
