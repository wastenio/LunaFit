import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const backupDirectory = join(process.cwd(), 'prisma', 'backups');
const timestamp = new Date().toISOString().replaceAll(':', '-');
const outputPath =
  process.argv[2] || join(backupDirectory, `lunafit-sqlite-${timestamp}.json`);

async function exportData() {
  await mkdir(backupDirectory, { recursive: true });

  const tables = {
    products: await prisma.product.findMany({ orderBy: { id: 'asc' } }),
    users: await prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    accounts: await prisma.account.findMany({ orderBy: { id: 'asc' } }),
    sessions: await prisma.session.findMany({ orderBy: { id: 'asc' } }),
    verificationTokens: await prisma.verificationToken.findMany({
      orderBy: [{ identifier: 'asc' }, { token: 'asc' }],
    }),
    authenticators: await prisma.authenticator.findMany({
      orderBy: [{ userId: 'asc' }, { credentialID: 'asc' }],
    }),
    cartItems: await prisma.cartItem.findMany({ orderBy: { id: 'asc' } }),
    orders: await prisma.order.findMany({ orderBy: { id: 'asc' } }),
    orderItems: await prisma.orderItem.findMany({ orderBy: { id: 'asc' } }),
    orderStatusEvents: await prisma.orderStatusEvent.findMany({
      orderBy: { id: 'asc' },
    }),
    customerNotifications: await prisma.customerNotification.findMany({
      orderBy: { id: 'asc' },
    }),
    analyticsEvents: await prisma.analyticsEvent.findMany({
      orderBy: { id: 'asc' },
    }),
    customerAuthTokens: await prisma.customerAuthToken.findMany({
      orderBy: { id: 'asc' },
    }),
  };
  const counts = Object.fromEntries(
    Object.entries(tables).map(([name, rows]) => [name, rows.length])
  );
  const backup = {
    format: 'lunafit-database-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    source: 'sqlite',
    counts,
    tables,
  };

  await writeFile(outputPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputPath, counts }, null, 2));
}

exportData()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
