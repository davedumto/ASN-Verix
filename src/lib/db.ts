import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  if (!env.DATABASE_URL) {
    // Demo mode: return a proxy so imports succeed but any DB call throws a
    // clear message that is caught by the try/catch blocks in task-store, etc.
    return new Proxy({} as PrismaClient, {
      get(_target, prop: string | symbol) {
        throw new Error(
          `[db] No database configured (running in demo mode).\n` +
          `  Attempted: prisma.${String(prop)}\n` +
          `  → Set DATABASE_URL in .env.local, or switch to a real mode.\n`
        );
      },
    });
  }

  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
