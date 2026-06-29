import { test, expect } from '../fixtures/api'

async function adminId(api: any): Promise<number> {
  const users = (await (await api.get('/api/users')).json()).users
  return users.find((u: any) => u.email === 'admin@beverage.com').id
}

test.describe('Users & roles (admin-only)', () => {
  test('admin creates a user; duplicate email and weak password rejected; no hash leak', async ({ api }) => {
    const create = await api.post('/api/users', {
      data: { email: 'newstaff@beverage.com', fullName: 'New Staff', password: 'secret1', role: 'user' },
    })
    expect(create.status()).toBe(201)
    const created = (await create.json()).user
    expect(created.passwordHash).toBeUndefined()

    const dup = await api.post('/api/users', {
      data: { email: 'newstaff@beverage.com', fullName: 'Dup', password: 'secret1', role: 'user' },
    })
    expect(dup.status()).toBe(400) // duplicate email

    const weak = await api.post('/api/users', {
      data: { email: 'weak@beverage.com', fullName: 'Weak', password: '123', role: 'user' },
    })
    expect(weak.ok()).toBeFalsy() // password too short
  })

  test('GET /api/users never leaks passwordHash', async ({ api }) => {
    const users = (await (await api.get('/api/users')).json()).users
    expect(users.length).toBeGreaterThan(0)
    for (const u of users) expect(u.passwordHash).toBeUndefined()
  })

  test('reset password lets the user log in with the new password', async ({ api, anonApi }) => {
    const id = (await (await api.post('/api/users', {
      data: { email: 'reset@beverage.com', fullName: 'Reset Me', password: 'oldpass1', role: 'user' },
    })).json()).user.id

    expect((await api.put(`/api/users/${id}`, { data: { password: 'newpass1' } })).ok()).toBeTruthy()

    const login = await anonApi.post('/api/auth/login', { data: { email: 'reset@beverage.com', password: 'newpass1' } })
    expect(login.ok()).toBeTruthy()
  })

  test('deactivated user cannot log in', async ({ api, anonApi }) => {
    const id = (await (await api.post('/api/users', {
      data: { email: 'deact@beverage.com', fullName: 'Deact', password: 'pass1234', role: 'user' },
    })).json()).user.id

    expect((await api.put(`/api/users/${id}`, { data: { isActive: false } })).ok()).toBeTruthy()

    const login = await anonApi.post('/api/auth/login', { data: { email: 'deact@beverage.com', password: 'pass1234' } })
    expect(login.status()).toBe(401)
  })

  test('admin cannot deactivate or demote their own account', async ({ api }) => {
    const id = await adminId(api)
    expect((await api.put(`/api/users/${id}`, { data: { isActive: false } })).status()).toBe(400)
    expect((await api.put(`/api/users/${id}`, { data: { role: 'user' } })).status()).toBe(400)
  })

  test('non-admin is forbidden from user management (403)', async ({ userApi }) => {
    expect((await userApi.get('/api/users')).status()).toBe(403)
    expect(
      (await userApi.post('/api/users', { data: { email: 'x@y.z', fullName: 'X', password: 'pass1234', role: 'user' } })).status()
    ).toBe(403)
  })

  test('unauthenticated request is rejected (401)', async ({ anonApi }) => {
    expect((await anonApi.get('/api/users')).status()).toBe(401)
  })

  test('unit creation requires admin — non-admin gets 403', async ({ userApi }) => {
    expect((await userApi.post('/api/units', { data: { code: 'XU', name: 'X Unit' } })).status()).toBe(403)
  })
})
