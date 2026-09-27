import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('🌱 Starting Voice2Flow database seeding...');
  // Verify database connectivity
  await prisma.$queryRaw`SELECT 1`;
  console.log('✅ Database connected. Seed baseline ready.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
