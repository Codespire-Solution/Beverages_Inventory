import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Runs once before the whole test suite:
 *  1. Reset the Postgres dev DB (schema + data) — DESTRUCTIVE, intended for tests.
 *     --skip-generate avoids re-writing the Prisma engine DLL (Windows EPERM lock).
 *  2. Seed rich, deterministic test data.
 *  3. Log in as admin and save storageState so every test starts authenticated.
 */
async function globalSetup() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002'
  const root = process.cwd()

  console.log('🔄 [global-setup] Resetting database...')
  execSync('npx prisma db push --force-reset --accept-data-loss --skip-generate', {
    stdio: 'inherit',
    cwd: root,
  })

  console.log('🌱 [global-setup] Seeding test data...')
  execSync('npm run db:seed:test', { stdio: 'inherit', cwd: root })

  console.log(`🔑 [global-setup] Logging in admin at ${baseURL} ...`)
  const res = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@beverage.com', password: 'admin123' }),
  })
  if (!res.ok) {
    throw new Error(
      `[global-setup] Login failed (${res.status}). Is the app running on ${baseURL}? ` +
        `Start it with: npm run dev -- -p 3002`
    )
  }
  const { token, user } = (await res.json()) as { token: string; user: unknown }

  const origin = new URL(baseURL).origin
  const storageState = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          { name: 'token', value: token },
          { name: 'user', value: JSON.stringify(user) },
        ],
      },
    ],
  }

  const authDir = path.join(root, 'tests', '.auth')
  mkdirSync(authDir, { recursive: true })
  writeFileSync(path.join(authDir, 'admin.json'), JSON.stringify(storageState, null, 2))
  console.log('✅ [global-setup] Auth state saved to tests/.auth/admin.json')
}

export default globalSetup
