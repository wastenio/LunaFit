import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { verifyPassword } from '@/features/auth/password';
import { getPrisma } from '@/lib/prisma';

export function isGoogleAuthConfigured() {
  return Boolean(
    process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim()
  );
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: PrismaAdapter(getPrisma()),
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = normalizeEmail(credentials.email);
        const password =
          typeof credentials.password === 'string' ? credentials.password : '';
        const user = email
          ? await getPrisma().user.findUnique({
              select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                image: true,
                passwordHash: true,
                authVersion: true,
              },
              where: { email },
            })
          : null;
        const passwordMatches = await verifyPassword(password, user?.passwordHash);

        if (!user || !user.emailVerified || !passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          authVersion: user.authVersion,
        };
      },
    }),
    ...(isGoogleAuthConfigured()
      ? [Google({ allowDangerousEmailAccountLinking: true })]
      : []),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authVersion =
          user.authVersion ??
          (
            await getPrisma().user.findUnique({
              select: { authVersion: true },
              where: { id: user.id },
            })
          )?.authVersion ??
          0;

        token.authVersion = authVersion;
        return token;
      }

      if (token.sub) {
        const currentUser = await getPrisma().user.findUnique({
          select: { authVersion: true },
          where: { id: token.sub },
        });

        if (!currentUser || currentUser.authVersion !== token.authVersion) {
          return null;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
}));
