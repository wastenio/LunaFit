process.env.DATABASE_URL ||= 'file:./dev.db';

const { PrismaClient } = await import('@prisma/client');

const prisma = new PrismaClient();

try {
  const result = await prisma.product.deleteMany({
    where: {
      slug: {
        startsWith: 'demo-',
      },
    },
  });

  console.log(`${result.count} produtos de demonstracao removidos.`);
} finally {
  await prisma.$disconnect();
}
