import { prisma } from './prisma'

/**
 * Convert quantity from one unit to another
 * @param quantity - The quantity to convert
 * @param fromUnitId - Source unit ID
 * @param toUnitId - Target unit ID
 * @returns Converted quantity
 */
export async function convertUnit(
  quantity: number,
  fromUnitId: number,
  toUnitId: number
): Promise<number> {
  if (fromUnitId === toUnitId) return quantity

  const fromUnit = await prisma.unit.findUnique({ where: { id: fromUnitId } })
  const toUnit = await prisma.unit.findUnique({ where: { id: toUnitId } })

  if (!fromUnit || !toUnit) {
    throw new Error('Unit not found')
  }

  // Get base units
  const fromBaseUnit = fromUnit.baseUnitId ? await prisma.unit.findUnique({ where: { id: fromUnit.baseUnitId } }) : fromUnit
  const toBaseUnit = toUnit.baseUnitId ? await prisma.unit.findUnique({ where: { id: toUnit.baseUnitId } }) : toUnit

  if (!fromBaseUnit || !toBaseUnit) {
    throw new Error('Base unit not found')
  }

  // If same base unit, use conversion factors
  if (fromBaseUnit.id === toBaseUnit.id) {
    // Convert to base unit first
    const baseQuantity = quantity * fromUnit.conversionFactor
    // Convert from base to target
    return baseQuantity / toUnit.conversionFactor
  }

  // Different base units - cannot convert directly
  throw new Error(`Cannot convert between ${fromUnit.name} and ${toUnit.name} (different base units)`)
}

/**
 * Convert quantity to base unit
 * @param quantity - The quantity to convert
 * @param unitId - Unit ID
 * @returns Quantity in base unit
 */
export async function convertToBaseUnit(quantity: number, unitId: number): Promise<number> {
  const unit = await prisma.unit.findUnique({ where: { id: unitId } })
  if (!unit) throw new Error('Unit not found')

  if (unit.baseUnitId) {
    return quantity * unit.conversionFactor
  }
  return quantity
}

/**
 * Convert quantity from base unit to preferred unit
 * @param quantity - The quantity in base unit
 * @param preferredUnitId - Preferred unit ID
 * @returns Quantity in preferred unit
 */
export async function convertFromBaseUnit(quantity: number, preferredUnitId: number): Promise<number> {
  const unit = await prisma.unit.findUnique({ where: { id: preferredUnitId } })
  if (!unit) throw new Error('Unit not found')

  if (unit.baseUnitId) {
    return quantity / unit.conversionFactor
  }
  return quantity
}

/**
 * Get conversion factor between two units
 * @param fromUnitId - Source unit ID
 * @param toUnitId - Target unit ID
 * @returns Conversion factor
 */
export async function getConversionFactor(fromUnitId: number, toUnitId: number): Promise<number> {
  if (fromUnitId === toUnitId) return 1

  const fromUnit = await prisma.unit.findUnique({ where: { id: fromUnitId } })
  const toUnit = await prisma.unit.findUnique({ where: { id: toUnitId } })

  if (!fromUnit || !toUnit) {
    throw new Error('Unit not found')
  }

  // If same base unit, calculate factor
  const fromBaseId = fromUnit.baseUnitId || fromUnit.id
  const toBaseId = toUnit.baseUnitId || toUnit.id

  if (fromBaseId === toBaseId) {
    return fromUnit.conversionFactor / toUnit.conversionFactor
  }

  throw new Error(`Cannot convert between ${fromUnit.name} and ${toUnit.name}`)
}

