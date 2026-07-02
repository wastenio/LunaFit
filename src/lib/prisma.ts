import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

function getLocalEnvValue(key: string) {
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }

  try {
    const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    const line = envFile
      .split(/\r?\n/)
      .find((candidate) => candidate.startsWith(`${key}=`));

    if (!line) {
      return undefined;
    }

    const value = line.slice(key.length + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    return value;
  } catch {
    return undefined;
  }
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim() || getLocalEnvValue('DATABASE_URL');

  if (!databaseUrl) {
    return undefined;
  }

  try {
    const url = new URL(databaseUrl);

    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '20');
    }

    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '30');
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    const databaseUrl = getDatabaseUrl();

    globalForPrisma.prisma = new PrismaClient(
      databaseUrl
        ? {
            datasources: {
              db: {
                url: databaseUrl,
              },
            },
          }
        : undefined
    );
  }

  return globalForPrisma.prisma;
}
