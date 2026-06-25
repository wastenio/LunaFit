import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const inputPath = process.argv[2];

if (!inputPath) {
  console.error(
    'Informe o backup: npm run db:import:postgres -- prisma/backups/arquivo.json'
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const dateFields = {
  products: ['promoStartsAt', 'promoEndsAt', 'createdAt', 'updatedAt'],
  users: ['emailVerified', 'createdAt', 'updatedAt'],
  sessions: ['expires'],
  verificationTokens: ['expires'],
  cartItems: ['createdAt', 'updatedAt'],
  orders: ['createdAt', 'updatedAt'],
  orderStatusEvents: ['createdAt'],
  customerNotifications: ['readAt', 'createdAt'],
  analyticsEvents: ['createdAt'],
  customerAuthTokens: ['expiresAt', 'createdAt'],
};

const importOrder = [
  ['products', 'product'],
  ['users', 'user'],
  ['accounts', 'account'],
  ['sessions', 'session'],
  ['verificationTokens', 'verificationToken'],
  ['authenticators', 'authenticator'],
  ['cartItems', 'cartItem'],
  ['orders', 'order'],
  ['orderItems', 'orderItem'],
  ['orderStatusEvents', 'orderStatusEvent'],
  ['customerNotifications', 'customerNotification'],
  ['analyticsEvents', 'analyticsEvent'],
  ['customerAuthTokens', 'customerAuthToken'],
];

const sequenceTables = [
  'Product',
  'CartItem',
  'Order',
  'OrderItem',
  'OrderStatusEvent',
  'CustomerNotification',
  'AnalyticsEvent',
  'CustomerAuthToken',
];

function restoreDates(tableName, rows) {
  const fields = dateFields[tableName] || [];

  return rows.map((row) => {
    const restored = { ...row };

    for (const field of fields) {
      if (restored[field]) {
        restored[field] = new Date(restored[field]);
      }
    }

    return restored;
  });
}

async function resetSequence(tableName) {
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"${tableName}"', 'id'),
      COALESCE(MAX("id"), 1),
      MAX("id") IS NOT NULL
    )
    FROM "${tableName}";
  `);
}

async function importData() {
  const backup = JSON.parse(await readFile(inputPath, 'utf8'));

  if (
    backup.format !== 'lunafit-database-export' ||
    backup.version !== 1 ||
    !backup.tables
  ) {
    throw new Error('Arquivo de backup LunaFit invalido.');
  }

  const imported = {};

  for (const [tableName, clientName] of importOrder) {
    const rows = restoreDates(tableName, backup.tables[tableName] || []);

    if (rows.length === 0) {
      imported[tableName] = 0;
      continue;
    }

    const result = await prisma[clientName].createMany({
      data: rows,
      skipDuplicates: true,
    });
    imported[tableName] = result.count;
  }

  for (const tableName of sequenceTables) {
    await resetSequence(tableName);
  }

  console.log(JSON.stringify({ inputPath, imported }, null, 2));
}

importData()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
