import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const ALL_MODULES = [
  'pos', 'products', 'stock', 'income', 'reports', 'reports_full',
  'export', 'users', 'billing', 'chat', 'settings',
]

async function main() {
  console.log('Seeding database...')

  // Create packages
  const freePackage = await prisma.package.upsert({
    where: { id: 'pkg-free' },
    update: {
      description: 'Get started for free. All features included — limited to 500 sales/month.',
      monthlyPrice: 0,
      annualPrice: 0,
      modules: ALL_MODULES,
    },
    create: {
      id: 'pkg-free',
      name: 'Free',
      description: 'Get started for free. All features included — limited to 500 sales/month.',
      saleLimit: 500,
      monthlyPrice: 0,
      annualPrice: 0,
      modules: ALL_MODULES,
      sortOrder: 0,
      isDefault: true,
    },
  })

  const businessPackage = await prisma.package.upsert({
    where: { id: 'pkg-business' },
    update: {
      description: 'For growing shops. 5,000 sales/month with full reporting and export.',
      monthlyPrice: 9.99,
      annualPrice: 99.99,
      modules: ALL_MODULES,
    },
    create: {
      id: 'pkg-business',
      name: 'Business',
      description: 'For growing shops. 5,000 sales/month with full reporting and export.',
      saleLimit: 5000,
      monthlyPrice: 9.99,
      annualPrice: 99.99,
      modules: ALL_MODULES,
      sortOrder: 1,
    },
  })

  const unlimitedPackage = await prisma.package.upsert({
    where: { id: 'pkg-unlimited' },
    update: {
      description: 'No limits. Unlimited sales with all features.',
      monthlyPrice: 19.99,
      annualPrice: 199.99,
      modules: ALL_MODULES,
    },
    create: {
      id: 'pkg-unlimited',
      name: 'Unlimited',
      description: 'No limits. Unlimited sales with all features.',
      saleLimit: null,
      monthlyPrice: 19.99,
      annualPrice: 199.99,
      modules: ALL_MODULES,
      sortOrder: 2,
    },
  })

  console.log('Created packages:', freePackage.name, businessPackage.name, unlimitedPackage.name)

  // Create platform owner
  const email = process.env.PLATFORM_OWNER_EMAIL || 'admin@cafeos.com'
  const password = process.env.PLATFORM_OWNER_PASSWORD || 'changeme'
  const passwordHash = await hash(password, 12)

  const platformOwner = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Platform Admin',
      email,
      passwordHash,
      role: 'PLATFORM_OWNER',
      isActive: true,
    },
  })

  console.log('Created platform owner:', platformOwner.email)

  // Create platform settings
  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      telegramUsername: 'cafeos_support',
    },
  })

  console.log('Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
