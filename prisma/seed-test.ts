/**
 * Rich, deterministic TEST seed for E2E permutation testing.
 * Mirrors the upsert style of prisma/seed.ts. Safe to re-run.
 *
 * Stable "code"/"email" handles are what the tests assert against.
 * Designed to exercise: FIFO (multi-batch, different expiries), low-stock alerts,
 * expiring-soon alerts, multi-warehouse transfers, roles (admin + user).
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== '1') {
  console.error('❌ Refusing to seed: NODE_ENV=production. Set ALLOW_PROD_SEED=1 to override.')
  process.exit(1)
}

const prisma = new PrismaClient()

const now = new Date()
const addDays = (days: number) => {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  return d
}

async function main() {
  console.log('🌱 Seeding TEST database...')

  // ---- Users (admin + normal) ----
  const adminHash = await bcrypt.hash('admin123', 10)
  const userHash = await bcrypt.hash('user123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@beverage.com' },
    update: { passwordHash: adminHash, role: 'admin', isActive: true },
    create: { email: 'admin@beverage.com', passwordHash: adminHash, fullName: 'Admin User', role: 'admin', isActive: true },
  })
  await prisma.user.upsert({
    where: { email: 'user@beverage.com' },
    update: { passwordHash: userHash, role: 'user', isActive: true },
    create: { email: 'user@beverage.com', passwordHash: userHash, fullName: 'Normal User', role: 'user', isActive: true },
  })

  // ---- Units ----
  const unitDefs = [
    { code: 'ML', name: 'Milliliter', conversionFactor: 1 },
    { code: 'L', name: 'Liter', conversionFactor: 1000 },
    { code: 'G', name: 'Gram', conversionFactor: 1 },
    { code: 'KG', name: 'Kilogram', conversionFactor: 1000 },
    { code: 'PCS', name: 'Pieces', conversionFactor: 1 },
  ]
  const units: Record<string, number> = {}
  for (const u of unitDefs) {
    const created = await prisma.unit.upsert({
      where: { code: u.code },
      update: { name: u.name, conversionFactor: u.conversionFactor, isActive: true },
      create: u,
    })
    units[u.code] = created.id
  }

  // ---- Warehouses ----
  const wh1 = await prisma.warehouse.upsert({
    where: { code: 'WH-001' },
    update: {},
    create: { code: 'WH-001', name: 'Main Warehouse', address: '123 Production St', isActive: true },
  })
  const wh2 = await prisma.warehouse.upsert({
    where: { code: 'WH-002' },
    update: {},
    create: { code: 'WH-002', name: 'Secondary Warehouse', address: '456 Storage Rd', isActive: true },
  })

  // ---- Suppliers ----
  for (const s of [
    { code: 'SUP-001', name: 'Citrus Supplies Ltd', email: 'sales@citrus.test' },
    { code: 'SUP-002', name: 'Packaging Partners', email: 'orders@packpartners.test' },
  ]) {
    await prisma.supplier.upsert({ where: { code: s.code }, update: {}, create: { ...s, isActive: true } })
  }

  // ---- Customers (CUST-001 taxed, CUST-002 tax-free) ----
  await prisma.customer.upsert({
    where: { code: 'CUST-001' },
    update: { taxRate: 5 },
    create: { code: 'CUST-001', name: 'Sharma Stores', email: 'sharma@store.test', taxRate: 5, isActive: true },
  })
  await prisma.customer.upsert({
    where: { code: 'CUST-002' },
    update: { taxRate: 0 },
    create: { code: 'CUST-002', name: 'Quick Mart', email: 'qm@mart.test', taxRate: 0, isActive: true },
  })

  // ---- Items ----
  const itemDefs = [
    { code: 'RM-001', name: 'Orange Concentrate', category: 'raw_material', baseUnitId: units['ML'], standardCost: 0.12, minStockQuantity: 50, hasExpiry: true },
    { code: 'RM-002', name: 'Sugar', category: 'raw_material', baseUnitId: units['G'], standardCost: 0.05, minStockQuantity: 100, hasExpiry: false },
    { code: 'RM-003', name: 'Water', category: 'raw_material', baseUnitId: units['ML'], standardCost: 0.001, minStockQuantity: 10000, hasExpiry: false },
    { code: 'PK-001', name: 'Bottle 1L', category: 'packaging', baseUnitId: units['PCS'], standardCost: 5, minStockQuantity: 500, hasExpiry: false },
    // Finished-good item code MUST equal the SKU code — the app maps a SKU to its
    // sellable stock by matching sku.code === item.code (category 'finished_good').
    { code: 'SKU-OJ1L', name: 'Orange Juice 1L (FG)', category: 'finished_good', baseUnitId: units['PCS'], standardCost: 40, minStockQuantity: 50, hasExpiry: true },
  ]
  const items: Record<string, number> = {}
  for (const it of itemDefs) {
    const created = await prisma.item.upsert({
      where: { code: it.code },
      update: { name: it.name, category: it.category, baseUnitId: it.baseUnitId, standardCost: it.standardCost, minStockQuantity: it.minStockQuantity, hasExpiry: it.hasExpiry, isActive: true },
      create: { ...it, taxRate: 0, isActive: true, createdBy: admin.id },
    })
    items[it.code] = created.id
  }

  // ---- SKU + Recipe ----
  const sku = await prisma.sku.upsert({
    where: { code: 'SKU-OJ1L' },
    update: { name: 'Orange Juice 1L', unitId: units['PCS'], standardCost: 40, taxRate: 5, hasExpiry: true },
    create: { code: 'SKU-OJ1L', name: 'Orange Juice 1L', unitId: units['PCS'], standardCost: 40, taxRate: 5, hasExpiry: true, isActive: true },
  })

  const recipe = await prisma.recipeVersion.upsert({
    where: { skuId_versionNumber: { skuId: sku.id, versionNumber: 1 } },
    update: { isActive: true, effectiveFrom: now },
    create: { skuId: sku.id, versionNumber: 1, effectiveFrom: now, isActive: true, createdBy: admin.id },
  })
  // ingredients: clear + recreate to stay deterministic
  await prisma.recipeIngredient.deleteMany({ where: { recipeVersionId: recipe.id } })
  await prisma.recipeIngredient.createMany({
    // Small per-unit quantities so a target of 5 needs 100ml RM-001 — which spans the
    // 40/50/80ml FIFO lots (OC-A → OC-B → OC-C) and stays within seeded stock.
    data: [
      { recipeVersionId: recipe.id, itemId: items['RM-001'], quantity: 20, unitId: units['ML'] },
      { recipeVersionId: recipe.id, itemId: items['RM-002'], quantity: 5, unitId: units['G'] },
      { recipeVersionId: recipe.id, itemId: items['RM-003'], quantity: 75, unitId: units['ML'] },
      { recipeVersionId: recipe.id, itemId: items['PK-001'], quantity: 1, unitId: units['PCS'] },
    ],
  })

  // ---- Inventory batches ----
  const batchDefs = [
    // RM-001: 3 lots, different expiry -> FIFO picks soonest expiry first
    { itemId: items['RM-001'], warehouseId: wh1.id, batchNumber: 'OC-A', quantity: 40, unitId: units['ML'], expiryDate: addDays(30), receivedDate: addDays(-10), unitCost: 0.12 },
    { itemId: items['RM-001'], warehouseId: wh1.id, batchNumber: 'OC-B', quantity: 50, unitId: units['ML'], expiryDate: addDays(60), receivedDate: addDays(-5), unitCost: 0.12 },
    { itemId: items['RM-001'], warehouseId: wh1.id, batchNumber: 'OC-C', quantity: 80, unitId: units['ML'], expiryDate: addDays(90), receivedDate: addDays(-1), unitCost: 0.13 },
    // RM-002: below minStock(100) -> low-stock alert
    { itemId: items['RM-002'], warehouseId: wh1.id, batchNumber: 'SG-A', quantity: 30, unitId: units['G'], expiryDate: null, receivedDate: addDays(-3), unitCost: 0.05 },
    // RM-003: plenty
    { itemId: items['RM-003'], warehouseId: wh1.id, batchNumber: 'WT-A', quantity: 100000, unitId: units['ML'], expiryDate: null, receivedDate: addDays(-3), unitCost: 0.001 },
    // PK-001: plenty
    { itemId: items['PK-001'], warehouseId: wh1.id, batchNumber: 'BT-A', quantity: 1000, unitId: units['PCS'], expiryDate: null, receivedDate: addDays(-3), unitCost: 5 },
    // Finished goods for SKU-OJ1L: two lots, different expiry -> FIFO delivery picks
    // the soonest-expiry (FG-A) first. FG-A also expires within 30 days -> expiring alert.
    { itemId: items['SKU-OJ1L'], warehouseId: wh1.id, batchNumber: 'FG-A', quantity: 60, unitId: units['PCS'], expiryDate: addDays(20), receivedDate: addDays(-4), unitCost: 40 },
    { itemId: items['SKU-OJ1L'], warehouseId: wh1.id, batchNumber: 'FG-B', quantity: 100, unitId: units['PCS'], expiryDate: addDays(40), receivedDate: addDays(-2), unitCost: 40 },
    // RM-001 also has a small lot in WH-002 (for transfer tests)
    { itemId: items['RM-001'], warehouseId: wh2.id, batchNumber: 'OC-W2', quantity: 25, unitId: units['ML'], expiryDate: addDays(45), receivedDate: addDays(-2), unitCost: 0.12 },
  ]
  for (const b of batchDefs) {
    await prisma.inventoryBatch.upsert({
      where: { itemId_warehouseId_batchNumber: { itemId: b.itemId, warehouseId: b.warehouseId, batchNumber: b.batchNumber } },
      update: { quantity: b.quantity, expiryDate: b.expiryDate, receivedDate: b.receivedDate, unitCost: b.unitCost, unitId: b.unitId },
      create: b,
    })
  }

  console.log('✅ TEST seed complete:')
  console.log(`   users=2, units=${unitDefs.length}, warehouses=2, suppliers=2, customers=2`)
  console.log(`   items=${itemDefs.length}, sku=1, recipeIngredients=4, batches=${batchDefs.length}`)
}

main()
  .catch((e) => {
    console.error('❌ TEST seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
