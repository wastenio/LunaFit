process.env.DATABASE_URL ||= 'file:./dev.db';

const { PrismaClient } = await import('@prisma/client');

const prisma = new PrismaClient();
const now = new Date();
const promotionEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

const demoProducts = [
  {
    name: 'Conjunto Pulse Demo',
    slug: 'demo-conjunto-pulse-preto',
    description:
      'Conjunto fitness de demonstracao com top de sustentacao e legging de cintura alta para testar catalogo, carrinho e checkout.',
    priceInCents: 19990,
    promoPriceInCents: 15990,
    promoStartsAt: now,
    promoEndsAt: promotionEndsAt,
    imageUrl: '/images/demo-products/conjunto-pulse-preto.png',
    imageAlt: 'Conjunto fitness preto com detalhes coral',
    category: 'Conjuntos',
    sizes: 'P, M, G, GG',
    colors: 'Preto, Coral',
    stock: 18,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Macacao Flow Demo',
    slug: 'demo-macacao-flow-vinho',
    description:
      'Macacao fitness de demonstracao com modelagem inteira e recortes estruturados para testar variacoes e exibicao de produto.',
    priceInCents: 25990,
    promoPriceInCents: null,
    promoStartsAt: null,
    promoEndsAt: null,
    imageUrl: '/images/demo-products/macacao-flow-vinho.png',
    imageAlt: 'Macacao fitness vinho em estudio claro',
    category: 'Macacoes',
    sizes: 'P, M, G',
    colors: 'Vinho, Preto',
    stock: 9,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Conjunto Move Demo',
    slug: 'demo-conjunto-move-verde',
    description:
      'Conjunto de top e short ciclista para demonstrar uma opcao leve de treino, com cores, tamanhos e estoque reais no sistema.',
    priceInCents: 16990,
    promoPriceInCents: 12990,
    promoStartsAt: now,
    promoEndsAt: promotionEndsAt,
    imageUrl: '/images/demo-products/conjunto-move-verde.png',
    imageAlt: 'Conjunto fitness verde com top e short ciclista',
    category: 'Conjuntos',
    sizes: 'PP, P, M, G',
    colors: 'Verde salvia, Preto',
    stock: 24,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Look Motion Demo',
    slug: 'demo-look-motion-cinza',
    description:
      'Look athleisure de demonstracao com jaqueta cropped e legging para testar a vitrine com uma proposta fitness urbana.',
    priceInCents: 23990,
    promoPriceInCents: null,
    promoStartsAt: null,
    promoEndsAt: null,
    imageUrl: '/images/demo-products/look-motion-cinza.png',
    imageAlt: 'Look fitness cinza com jaqueta cropped e legging',
    category: 'Athleisure',
    sizes: 'P, M, G',
    colors: 'Cinza claro, Grafite',
    stock: 12,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Legging Power Demo',
    slug: 'demo-legging-power',
    description:
      'Legging de demonstracao com cintura alta e tecido de compressao para testar produtos avulsos e combinacoes no carrinho.',
    priceInCents: 12990,
    promoPriceInCents: 9990,
    promoStartsAt: now,
    promoEndsAt: promotionEndsAt,
    imageUrl: '/images/demo-products/conjunto-pulse-preto.png',
    imageAlt: 'Legging fitness preta de cintura alta',
    category: 'Leggings',
    sizes: 'P, M, G, GG',
    colors: 'Preto, Grafite',
    stock: 30,
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'Top Essential Demo',
    slug: 'demo-top-essential',
    description:
      'Top fitness de demonstracao com sustentacao media para testar um produto de entrada com preco acessivel.',
    priceInCents: 8990,
    promoPriceInCents: null,
    promoStartsAt: null,
    promoEndsAt: null,
    imageUrl: '/images/demo-products/conjunto-move-verde.png',
    imageAlt: 'Top fitness verde de sustentacao media',
    category: 'Tops',
    sizes: 'PP, P, M, G',
    colors: 'Verde salvia, Branco, Preto',
    stock: 36,
    isActive: true,
    isFeatured: false,
  },
];

try {
  for (const product of demoProducts) {
    await prisma.product.upsert({
      create: product,
      update: product,
      where: { slug: product.slug },
    });
  }

  console.log(`${demoProducts.length} produtos de demonstracao adicionados.`);
} finally {
  await prisma.$disconnect();
}
