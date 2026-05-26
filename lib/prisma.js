import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL; 
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ 
    adapter,
    errorFormat: 'pretty',
  });
};

// Use globalThis to avoid redeclaration errors in production
// This prevents connection pool exhaustion in serverless environments
const globalForPrisma = global;

export const prisma =
  globalForPrisma.prisma ||
  prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
