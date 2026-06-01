import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding NotifyX Database...');

  const adminEmail = 'admin@notifyx.com';
  const userEmail = 'user@notifyx.com';

  const defaultPassword = 'Password123!'; // Feel free to override/customize
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Create or Update Admin Account
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin account configured: ${adminUser.email} (Password: ${defaultPassword})`);

  // 2. Create or Update Standard User Account
  const standardUser = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      passwordHash,
      role: 'USER',
    },
    create: {
      email: userEmail,
      passwordHash,
      role: 'USER',
    },
  });
  console.log(`✅ Standard user account configured: ${standardUser.email} (Password: ${defaultPassword})`);

  console.log('Database Seeding Completed Successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
