// Type definitions for the application

export interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'user'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Unit {
  id: number
  code: string
  name: string
  baseUnitId: number | null
  conversionFactor: number
  isActive: boolean
  baseUnit?: Unit
}

export interface Item {
  id: number
  code: string
  name: string
  description: string | null
  category: 'raw_material' | 'packaging' | 'finished_good'
  baseUnitId: number
  preferredUnitId: number | null
  standardCost: number
  moq: number | null
  minStockQuantity: number | null
  taxRate: number
  hasExpiry: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  baseUnit?: Unit
  preferredUnit?: Unit
}

export interface SKU {
  id: number
  code: string
  name: string
  description: string | null
  category: string
  unitId: number
  standardCost: number
  taxRate: number
  hasExpiry: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface RecipeVersion {
  id: number
  skuId: number
  versionNumber: string
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  createdAt: string
  createdBy: number | null
  sku?: SKU
  ingredients?: RecipeIngredient[]
}

export interface RecipeIngredient {
  id: number
  recipeVersionId: number
  itemId: number
  quantity: number
  unitId: number
  item?: Item
  unit?: Unit
}

export interface RecipeFormData {
  skuId: string
  versionNumber: string
  effectiveFrom: string
  effectiveTo: string
  isActive: boolean
  ingredients: RecipeIngredientFormData[]
}

export interface RecipeIngredientFormData {
  itemId: number
  quantity: number
  unitId: number
  item: Item
  unit: Unit
}

export interface CurrentIngredient {
  itemId: string
  quantity: string
  unitId: string
}

export interface ItemFormData {
  code: string
  name: string
  description: string
  category: 'raw_material' | 'packaging' | 'finished_good'
  baseUnitId: string
  preferredUnitId: string
  standardCost: number
  moq: string
  minStockQuantity: string
  taxRate: number
  hasExpiry: boolean
}

export interface UnitFormData {
  code: string
  name: string
  baseUnitId: string
  conversionFactor: string
}

export interface Warehouse {
  id: number
  code: string
  name: string
  address: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: number
  code: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  paymentTerms: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: number
  code: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  paymentTerms: string | null
  creditLimit: number | null
  taxRate: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiError {
  error: string
  message?: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
