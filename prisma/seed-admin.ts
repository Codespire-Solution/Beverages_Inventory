import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@beverage.com'
  const password = process.env.ADMIN_PASSWORD ?? 'admin123'
  const fullName = process.env.ADMIN_NAME ?? 'Admin User'

  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
    console.error('❌ ADMIN_PASSWORD env var is required when NODE_ENV=production.')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      fullName,
      role: 'admin',
      isActive: true,
    },
  })

  console.log(`✅ Admin user ready: ${admin.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
