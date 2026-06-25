# LunaFit

Site de moda fitness feminina com vitrine publica, cadastro real de produtos e painel administrativo protegido por senha.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- SQLite local para desenvolvimento

## Estrutura

- `src/app/(store)`: rotas publicas da loja.
- `src/app/admin/(protected)`: rotas protegidas do painel.
- `src/app/api/products`: API de produtos protegida para escrita.
- `src/features/products`: regra, validacao, consultas e componentes de produto.
- `src/features/admin`: acoes e componentes administrativos.
- `src/lib`: infraestrutura compartilhada, como Prisma, auth e formatacao.
- `src/config`: configuracoes da loja vindas de variaveis de ambiente.

## Setup local

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env` a partir de `.env.example` e configure:

```bash
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="sua-senha-forte"
AUTH_SECRET="uma-string-longa-e-aleatoria"
AUTH_GOOGLE_ID="client-id-do-google"
AUTH_GOOGLE_SECRET="client-secret-do-google"
AUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_sua_chave_do_resend"
EMAIL_FROM="LunaFit <contato@seudominio.com>"
NEXT_PUBLIC_STORE_NAME="LunaFit"
NEXT_PUBLIC_STORE_INSTAGRAM_URL="https://instagram.com/sua-loja"
NEXT_PUBLIC_STORE_WHATSAPP_NUMBER="5585999999999"
NEXT_PUBLIC_STORE_EMAIL="contato@sualoja.com"
```

3. Prepare o banco:

```bash
npm run db:generate
npm run db:init
```

4. Rode o projeto:

```bash
npm run dev
```

5. Acesse:

- Loja: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

## Produtos

Nao ha produtos mockados. Cadastre produtos reais no painel administrativo. Apenas produtos marcados como publicados aparecem na vitrine publica. Promocoes podem ser ativadas imediatamente ou agendadas com data de inicio e fim pelo formulario do produto.

## Login de clientes e pedidos

O catalogo e publico. Para adicionar produtos ao carrinho e finalizar pedidos, o cliente entra
com uma conta Google ou com email e senha.

### Google

Crie credenciais OAuth do tipo aplicacao web no Google Cloud Console e configure o callback:

```text
http://localhost:3000/api/auth/callback/google
```

No ambiente local deste projeto, executado na porta `3210`, use:

```text
http://127.0.0.1:3210/api/auth/callback/google
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

Os pedidos sao gravados no banco, baixam o estoque e aguardam confirmacao de frete e pagamento
pela loja.

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
npm run build
```
