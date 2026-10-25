import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { seedDiscovery } from './seed-discovery';

async function main() {
  if (!['development', 'test'].includes(process.env.NODE_ENV ?? 'development'))
    throw new Error('Development/test only.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 2 }),
  });
  try {
    await db.$transaction((tx) => seedDiscovery(tx), { timeout: 30_000 });
    console.log(
      'Seeded 4 labelled fictional artists and links to existing demo events. No reviews, accounts or inventory changed.',
    );
  } finally {
    await db.$disconnect();
  }
}
void main().catch(() => {
  console.error('Discovery seed failed. Check migrations and database configuration.');
  process.exitCode = 1;
});
