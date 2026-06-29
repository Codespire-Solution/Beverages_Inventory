import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== '1') {
  console.error('❌ Refusing to seed: NODE_ENV=production. Set ALLOW_PROD_SEED=1 to override.')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@beverage.com' },
    update: {},
    create: {
      email: 'admin@beverage.com',
      passwordHash: hashedPassword,
      fullName: 'Admin User',
      role: 'admin',
      isActive: true,
    },
  })

  console.log('✅ Created admin user:', admin.email)

  // Create units
  const units = [
    { code: 'ML', name: 'Milliliter', conversionFactor: 1 },
    { code: 'L', name: 'Liter', conversionFactor: 1000 },
    { code: 'mg', name: 'Milligram', conversionFactor: 1 },
    { code: 'G', name: 'Gram', conversionFactor: 1000 },
    { code: 'KG', name: 'Kilogram', conversionFactor: 1000000 },
  ]

  const createdUnits = []
  for (const unit of units) {
    const created = await prisma.unit.upsert({
      where: { code: unit.code },
      update: {},
      create: unit,
    })
    createdUnits.push(created)
  }

  console.log('✅ Created units:', createdUnits.length)

  // Create warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-001' },
    update: {},
    create: {
      code: 'WH-001',
      name: 'Main Warehouse',
      address: '123 Production Street',
      isActive: true,
    },
  })

  console.log('✅ Created warehouse:', warehouse.name)

  // Create items (raw materials)
  const items = [
    { code: 'RM-001', name: 'Aluminium Can', category: 'packaging', baseUnit: 'PCS', standardCost: 0.05, hasExpiry: false },
    { code: 'RM-002', name: 'Carton Boxes', category: 'packaging', baseUnit: 'PCS', standardCost: 0.50, hasExpiry: false },
    { code: 'RM-003', name: 'Labels', category: 'packaging', baseUnit: 'PCS', standardCost: 0.02, hasExpiry: false },
    { code: 'RM-004', name: 'PE Packaging', category: 'packaging', baseUnit: 'KG', standardCost: 2.00, hasExpiry: false },
    { code: 'RM-005', name: 'Chicory Root Inulin', category: 'raw_material', baseUnit: 'KG', standardCost: 15.00, hasExpiry: true },
    { code: 'RM-006', name: 'Rosemary Extract', category: 'raw_material', baseUnit: 'KG', standardCost: 25.00, hasExpiry: true },
    { code: 'RM-007', name: 'Aloe Vera Extract', category: 'raw_material', baseUnit: 'KG', standardCost: 20.00, hasExpiry: true },
    { code: 'RM-008', name: 'Ashwagandha', category: 'raw_material', baseUnit: 'KG', standardCost: 30.00, hasExpiry: true },
    { code: 'RM-009', name: 'Pink Salt', category: 'raw_material', baseUnit: 'KG', standardCost: 5.00, hasExpiry: false },
    { code: 'RM-010', name: 'Monk Fruit', category: 'raw_material', baseUnit: 'KG', standardCost: 40.00, hasExpiry: true },
    { code: 'RM-011', name: 'Stevia', category: 'raw_material', baseUnit: 'KG', standardCost: 35.00, hasExpiry: true },
    { code: 'RM-012', name: 'Strawberry Natural Flavour', category: 'raw_material', baseUnit: 'L', standardCost: 50.00, hasExpiry: true },
    { code: 'RM-013', name: 'Litchi Natural Flavour', category: 'raw_material', baseUnit: 'L', standardCost: 50.00, hasExpiry: true },
    { code: 'RM-014', name: 'Lemon Natural Flavour', category: 'raw_material', baseUnit: 'L', standardCost: 45.00, hasExpiry: true },
    { code: 'RM-015', name: 'Lime Natural Flavour', category: 'raw_material', baseUnit: 'L', standardCost: 45.00, hasExpiry: true },
  ]

  const mlUnit = createdUnits.find(u => u.code === 'ML')
  const lUnit = createdUnits.find(u => u.code === 'L')
  const gUnit = createdUnits.find(u => u.code === 'G')
  const kgUnit = createdUnits.find(u => u.code === 'KG')

  const createdItems = []
  for (const item of items) {
    let unitId = gUnit!.id
    if (item.baseUnit === 'L') unitId = lUnit!.id
    if (item.baseUnit === 'KG') unitId = kgUnit!.id
    if (item.baseUnit === 'PCS') unitId = gUnit!.id // Using G as base for pieces

    const created = await prisma.item.upsert({
      where: { code: item.code },
      update: {},
      create: {
        code: item.code,
        name: item.name,
        category: item.category,
        baseUnitId: unitId,
        standardCost: item.standardCost,
        hasExpiry: item.hasExpiry,
        isActive: true,
        createdBy: admin.id,
      },
    })
    createdItems.push(created)
  }

  console.log('✅ Created items:', createdItems.length)

  // Create SKUs
  const skus = [
    { code: 'SKU-001', name: 'Strawberry Vanilla', unit: 'ML', standardCost: 2.50 },
    { code: 'SKU-002', name: 'Litchi Mango', unit: 'ML', standardCost: 2.50 },
    { code: 'SKU-003', name: 'Lemon Lime', unit: 'ML', standardCost: 2.50 },
  ]

  const createdSKUs = []
  for (const sku of skus) {
    const unitId = mlUnit!.id
    const created = await prisma.sku.upsert({
      where: { code: sku.code },
      update: {},
      create: {
        code: sku.code,
        name: sku.name,
        unitId: unitId,
        standardCost: sku.standardCost,
        isActive: true,
      },
    })
    createdSKUs.push(created)
  }

  console.log('✅ Created SKUs:', createdSKUs.length)

  // Create supplier
  const supplier = await prisma.supplier.upsert({
    where: { code: 'SUP-001' },
    update: {},
    create: {
      code: 'SUP-001',
      name: 'Raw Materials Supplier Inc.',
      contactPerson: 'John Doe',
      phone: '+1-555-0100',
      email: 'contact@supplier.com',
      address: '456 Supply Avenue',
      isActive: true,
    },
  })

  console.log('✅ Created supplier:', supplier.name)

  // Create customer
  const customer = await prisma.customer.upsert({
    where: { code: 'CUST-001' },
    update: {},
    create: {
      code: 'CUST-001',
      name: 'Beverage Distributors LLC',
      contactPerson: 'Jane Smith',
      phone: '+1-555-0200',
      email: 'orders@distributor.com',
      address: '789 Distribution Road',
      isActive: true,
    },
  })

  console.log('✅ Created customer:', customer.name)

  // Create some sample inventory batches
  const sampleBatches = [
    { itemCode: 'RM-001', batchNumber: 'BATCH-001', quantity: 10000, expiryDate: null },
    { itemCode: 'RM-005', batchNumber: 'BATCH-002', quantity: 100, expiryDate: new Date('2025-12-31') },
    { itemCode: 'RM-012', batchNumber: 'BATCH-003', quantity: 50, expiryDate: new Date('2025-06-30') },
  ]

  for (const batch of sampleBatches) {
    const item = createdItems.find(i => i.code === batch.itemCode)
    if (item) {
      await prisma.inventoryBatch.create({
        data: {
          itemId: item.id,
          warehouseId: warehouse.id,
          batchNumber: batch.batchNumber,
          quantity: batch.quantity,
          unitId: item.baseUnitId,
          receivedDate: new Date(),
          unitCost: item.standardCost,
          expiryDate: batch.expiryDate,
        },
      })
    }
  }

  console.log('✅ Created sample inventory batches')

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

