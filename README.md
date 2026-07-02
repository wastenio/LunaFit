# LunaFit

E-commerce de moda fitness feminina com catalogo, promocoes, contas de clientes,
carrinho, pedidos, notificacoes e painel administrativo.

Producao: <https://lunafit-azure.vercel.app>

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL Neon
- Vercel Blob para imagens de produtos
- Auth.js, Google OAuth e autenticacao por email/senha
- Resend para emails transacionais
- Mercado Pago Payment Brick para Pix, cartao, boleto e pagamentos online
- Melhor Envio para cotacao de frete com Correios e transportadoras

## Estrutura

- `src/app/(store)`: rotas publicas da loja.
- `src/app/admin/(protected)`: rotas protegidas do painel.
- `src/app/api/products`: API de produtos protegida para escrita.
- `src/features/auth`: login, cadastro, confirmacao de email e recuperacao de senha.
- `src/features/cart` e `src/features/orders`: carrinho, checkout e acompanhamento.
- `src/features/analytics`: eventos e indicadores administrativos.
- `src/features/products`: regra, validacao, consultas e componentes de produto.
- `src/features/admin`: acoes e componentes administrativos.
- `src/lib`: infraestrutura compartilhada, como Prisma e autenticacao.
- `prisma/migrations`: migration PostgreSQL usada em producao.
- `prisma/migrations-sqlite`: historico arquivado do banco local anterior.
- `src/config`: configuracoes da loja vindas de variaveis de ambiente.

## Setup local

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env.local` a partir de `.env.example` e configure:

```bash
DATABASE_URL="postgresql://usuario:senha@host/banco?sslmode=require&connect_timeout=20&pool_timeout=30"
DATABASE_URL_UNPOOLED="postgresql://usuario:senha@host/banco?sslmode=require&connect_timeout=20&pool_timeout=30"
ADMIN_PASSWORD="sua-senha-forte"
AUTH_SECRET="uma-string-longa-e-aleatoria"
AUTH_GOOGLE_ID="client-id-do-google"
AUTH_GOOGLE_SECRET="client-secret-do-google"
AUTH_URL="http://127.0.0.1:3210"
RESEND_API_KEY="re_sua_chave_do_resend"
EMAIL_FROM="LunaFit <contato@seudominio.com>"
MERCADO_PAGO_ACCESS_TOKEN="access-token-do-mercado-pago"
MERCADO_PAGO_WEBHOOK_SECRET="assinatura-secreta-do-webhook"
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY="public-key-do-mercado-pago"
NEXT_PUBLIC_APP_URL="https://lunafit-azure.vercel.app"
MELHOR_ENVIO_BASE_URL="https://sandbox.melhorenvio.com.br"
MELHOR_ENVIO_ACCESS_TOKEN="token-oauth-do-melhor-envio"
MELHOR_ENVIO_ORIGIN_POSTAL_CODE="60000000"
MELHOR_ENVIO_USER_AGENT="LunaFit (contato@seudominio.com)"
MELHOR_ENVIO_SERVICES="1,2,18"
MELHOR_ENVIO_WEBHOOK_SECRET="secret-do-aplicativo-melhor-envio"
NEXT_PUBLIC_STORE_NAME="LunaFit"
NEXT_PUBLIC_STORE_INSTAGRAM_URL="https://instagram.com/sua-loja"
NEXT_PUBLIC_STORE_WHATSAPP_NUMBER="5585999999999"
NEXT_PUBLIC_STORE_EMAIL="contato@sualoja.com"
```

Na Vercel, `DATABASE_URL`, `DATABASE_URL_UNPOOLED` e `BLOB_READ_WRITE_TOKEN`
sao fornecidas pelas integracoes Neon e Blob.

3. Gere o Prisma e aplique as migrations:

```bash
npm run db:generate
npm run db:init
```

4. Rode o projeto:

```bash
npm run dev
```

5. Acesse:

- Loja: `http://127.0.0.1:3210`
- Admin: `http://127.0.0.1:3210/admin`

## Produtos

Nao ha produtos mockados. Cadastre produtos reais no painel administrativo. Apenas produtos marcados como publicados aparecem na vitrine publica. Promocoes podem ser ativadas imediatamente ou agendadas com data de inicio e fim pelo formulario do produto.

## Login de clientes e pedidos

O catalogo e publico. Para adicionar produtos ao carrinho e finalizar pedidos, o cliente entra
com uma conta Google ou com email e senha.

### Google

Crie credenciais OAuth do tipo aplicacao web no Google Cloud Console e configure o callback:

```text
http://127.0.0.1:3210/api/auth/callback/google
https://lunafit-azure.vercel.app/api/auth/callback/google
```

### Email, confirmacao e recuperacao de senha

O cadastro por senha exige confirmacao do email. A recuperacao de acesso envia um link de uso
unico, valido por 30 minutos.

1. Crie uma conta no Resend.
2. Adicione e verifique o dominio usado pela loja.
3. Configure `RESEND_API_KEY` e `EMAIL_FROM` no `.env.local`.
4. Garanta que `AUTH_URL` contenha a URL publica correta do site.

Em desenvolvimento, o remetente de testes do Resend pode ter restricoes de destinatario. Para
clientes reais, use um dominio verificado.

Os pedidos sao gravados no PostgreSQL, reservam estoque e geram notificacoes a
cada mudanca de status operacional ou financeiro.

### Pagamentos Mercado Pago

O checkout usa Mercado Pago Payment Brick. O cliente finaliza os dados de entrega,
calcula e escolhe o frete, o pedido e reservado no banco e ele escolhe Pix, cartao
ou boleto na pagina de pagamento da LunaFit. O pagamento e criado pela API do
Mercado Pago e o webhook atualiza o status financeiro do pedido automaticamente.

Configure na Vercel e no `.env.local`:

```bash
MERCADO_PAGO_ACCESS_TOKEN=""
MERCADO_PAGO_WEBHOOK_SECRET=""
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=""
NEXT_PUBLIC_APP_URL="https://lunafit-azure.vercel.app"
```

URL do webhook:

```text
https://lunafit-azure.vercel.app/api/webhooks/mercadopago
```

Use credenciais de teste primeiro. Em producao, troque as variaveis por credenciais
produtivas e mantenha `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET`
como variaveis confidenciais.

Para testar em Sandbox, use as credenciais `TEST` da aplicacao Mercado Pago no
`MERCADO_PAGO_ACCESS_TOKEN` e em `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`. Use dados
de teste aceitos pelo Mercado Pago para cartoes, Pix e boleto. Nao use sua conta
real ou a conta Vendedor para pagar um pedido de teste.

No painel admin, pedidos com pagamento aprovado e ID do Mercado Pago podem ser
reembolsados. O reembolso solicita o estorno total pela API do Mercado Pago,
atualiza o status financeiro, cancela o pedido quando ele ainda nao foi concluido,
devolve o estoque e notifica o cliente.

### Frete e entrega

O frete usa a API do Melhor Envio para cotar Correios e transportadoras em tempo
real. Cada produto possui peso e dimensoes de embalagem no painel admin; mantenha
esses dados reais para que a cotacao seja confiavel.

Configure na Vercel e no `.env.local`:

```bash
MELHOR_ENVIO_BASE_URL="https://sandbox.melhorenvio.com.br"
MELHOR_ENVIO_ACCESS_TOKEN=""
MELHOR_ENVIO_ORIGIN_POSTAL_CODE=""
MELHOR_ENVIO_USER_AGENT="LunaFit (contato@seudominio.com)"
MELHOR_ENVIO_SERVICES=""
MELHOR_ENVIO_WEBHOOK_SECRET=""
```

Use `https://sandbox.melhorenvio.com.br` com token de sandbox nos testes e
`https://www.melhorenvio.com.br` com token produtivo quando a loja estiver pronta.
O `MELHOR_ENVIO_SERVICES` e opcional; deixe vazio para retornar os servicos
habilitados no painel Melhor Envio.

URL do webhook de entrega:

```text
https://lunafit-azure.vercel.app/api/webhooks/melhor-envio
```

No admin de pedidos, o responsavel pode salvar transportadora, codigo e link de
rastreio. Ao salvar, o cliente recebe notificacao e o pedido passa para enviado.

## Catalogo de demonstracao

Para adicionar seis produtos ficticios com imagens, estoque, tamanhos, precos e promocoes:

```bash
npm run db:seed:demo
```

Para remover apenas esses produtos:

```bash
npm run db:clear:demo
```

## Verificacao

```bash
npm run typecheck
npm run lint
npm run build
npm run db:verify
```
