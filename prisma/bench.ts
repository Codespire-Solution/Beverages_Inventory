/**
 * DB-latency benchmark. Bypasses Next.js. Run with:
 *   npx tsx prisma/bench.ts
 *
 * Measures the actual round-trip time for the queries the dashboard makes.
 * If these numbers are fast but the HTTP API is slow → bottleneck is Next dev compile.
 * If these numbers are slow → bottleneck is the remote DB.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now()
  const result = await fn()
  const elapsed = (performance.now() - t0).toFixed(0)
  console.log(`  ${elapsed.padStart(5)} ms  ${label}`)
  return result
}

async function main() {
  console.log('\n=== Cold-start (first query — includes Prisma engine boot) ===')
  await time('SELECT 1', () => prisma.$queryRaw`SELECT 1`)

  console.log('\n=== Warm round-trip latency (5x SELECT 1) ===')
  for (let i = 1; i <= 5; i++) {
    await time(`SELECT 1 (#${i})`, () => prisma.$queryRaw`SELECT 1`)
  }

  console.log('\n=== Individual dashboard queries (sequential) ===')
  const today = new Date()
  const dateStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1)
  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30)
  const thirtyDaysFromNow = new Date(today); thirtyDaysFromNow.setDate(today.getDate() + 30)

  await time('count purchaseOrder draft', () => prisma.purchaseOrder.count({ where: { status: 'draft' } }))
  await time('count customerOrder pending', () => prisma.customerOrder.count({ where: { status: 'pending' } }))
  await time('count productionBatch in_progress', () => prisma.productionBatch.count({ where: { status: 'in_progress' } }))
  await time('count expiring batches', () => prisma.inventoryBatch.count({ where: { expiryDate: { lte: thirtyDaysFromNow, gte: today }, quantity: { gt: 0 } } }))
  await time('aggregate salesInPeriod', () => prisma.customerOrder.aggregate({
    where: { orderDate: { gte: dateStart, lte: today }, status: { in: ['confirmed', 'delivered'] } },
    _sum: { grandTotal: true },
  }))
  await time('findMany batchValuation', () => prisma.inventoryBatch.findMany({
    where: { quantity: { gt: 0 } },
    select: { quantity: true, unitCost: true, item: { select: { standardCost: true } } },
  }))
  await time('groupBy topSKUs', () => prisma.customerOrderItem.groupBy({
    by: ['skuId'],
    where: { order: { orderDate: { gte: thirtyDaysAgo }, status: { in: ['confirmed', 'delivered'] } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  }))

  console.log('\n=== Same 7 queries in PARALLEL (Promise.all) ===')
  const t0 = performance.now()
  await Promise.all([
    prisma.purchaseOrder.count({ where: { status: 'draft' } }),
    prisma.customerOrder.count({ where: { status: 'pending' } }),
    prisma.productionBatch.count({ where: { status: 'in_progress' } }),
    prisma.inventoryBatch.count({ where: { expiryDate: { lte: thirtyDaysFromNow, gte: today }, quantity: { gt: 0 } } }),
    prisma.customerOrder.aggregate({
      where: { orderDate: { gte: dateStart, lte: today }, status: { in: ['confirmed', 'delivered'] } },
      _sum: { grandTotal: true },
    }),
    prisma.inventoryBatch.findMany({
      where: { quantity: { gt: 0 } },
      select: { quantity: true, unitCost: true, item: { select: { standardCost: true } } },
    }),
    prisma.customerOrderItem.groupBy({
      by: ['skuId'],
      where: { order: { orderDate: { gte: thirtyDaysAgo }, status: { in: ['confirmed', 'delivered'] } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ])
  console.log(`  ${(performance.now() - t0).toFixed(0).padStart(5)} ms  all 7 in parallel`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
