import { test as base, expect, APIRequestContext } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Reads the admin JWT saved by global-setup (tests/.auth/admin.json).
 */
function adminToken(): string {
  const p = path.join(process.cwd(), 'tests', '.auth', 'admin.json')
  const state = JSON.parse(readFileSync(p, 'utf-8'))
  const ls: Array<{ name: string; value: string }> = state.origins?.[0]?.localStorage ?? []
  const t = ls.find((e) => e.name === 'token')?.value
  if (!t) throw new Error('No admin token found in tests/.auth/admin.json (run global-setup)')
  return t
}

/** Log in via the API and return a fresh JWT (used for the normal-user context). */
async function loginToken(playwright: any, baseURL: string, email: string, password: string): Promise<string> {
  const ctx = await playwright.request.newContext({ baseURL })
  const res = await ctx.post('/api/auth/login', { data: { email, password } })
  if (!res.ok()) throw new Error(`login(${email}) -> HTTP ${res.status()}`)
  const token = (await res.json()).token as string
  await ctx.dispose()
  return token
}

type Fixtures = {
  /** Authenticated (admin) API request context with baseURL + Bearer token. */
  api: APIRequestContext
  /** Authenticated as the seeded NON-admin user (role 'user'). */
  userApi: APIRequestContext
  /** Unauthenticated context (no Authorization header) for 401 checks. */
  anonApi: APIRequestContext
}

export const test = base.extend<Fixtures>({
  api: async ({ playwright, baseURL }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${adminToken()}`,
        'Content-Type': 'application/json',
      },
    })
    await use(ctx)
    await ctx.dispose()
  },
  userApi: async ({ playwright, baseURL }, use) => {
    const token = await loginToken(playwright, baseURL!, 'user@beverage.com', 'user123')
    const ctx = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    await use(ctx)
    await ctx.dispose()
  },
  anonApi: async ({ playwright, baseURL }, use) => {
    const ctx = await playwright.request.newContext({ baseURL })
    await use(ctx)
    await ctx.dispose()
  },
})

export { expect }

/** Fetch a list endpoint and find the record with the given code. */
export async function byCode(
  api: APIRequestContext,
  listPath: string,
  key: string,
  code: string
): Promise<any> {
  const res = await api.get(listPath)
  if (!res.ok()) throw new Error(`GET ${listPath} -> HTTP ${res.status()}`)
  const data = await res.json()
  const arr = (data[key] ?? []) as any[]
  const found = arr.find((x) => x.code === code)
  if (!found) throw new Error(`No ${key} with code "${code}" found at ${listPath}`)
  return found
}

/** Convenience resolvers for the seeded reference data. */
export const refs = {
  sku: (api: APIRequestContext, code = 'SKU-OJ1L') => byCode(api, '/api/skus', 'skus', code),
  customer: (api: APIRequestContext, code = 'CUST-001') => byCode(api, '/api/customers', 'customers', code),
  supplier: (api: APIRequestContext, code = 'SUP-001') => byCode(api, '/api/suppliers', 'suppliers', code),
  warehouse: (api: APIRequestContext, code = 'WH-001') => byCode(api, '/api/warehouses', 'warehouses', code),
  item: (api: APIRequestContext, code: string) => byCode(api, '/api/items', 'items', code),
  unit: (api: APIRequestContext, code: string) => byCode(api, '/api/units', 'units', code),
}

/** Total sellable stock for a SKU id (sums finished-good batches). */
export async function skuStock(api: APIRequestContext, skuId: number): Promise<number> {
  const res = await api.get(`/api/inventory/sku/${skuId}/stock`)
  if (!res.ok()) throw new Error(`stock GET -> HTTP ${res.status()}`)
  const data = await res.json()
  return data.totalStock as number
}

/** All batches for an item id (used to assert FIFO decrement / receipts). */
export async function itemBatches(api: APIRequestContext, itemId: number): Promise<any[]> {
  const res = await api.get(`/api/inventory/item/${itemId}`)
  if (!res.ok()) throw new Error(`item batches GET -> HTTP ${res.status()}`)
  const data = await res.json()
  return (data.batches ?? []) as any[]
}
