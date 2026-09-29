import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { createShareGateway } from './server.mjs'

describe('createShareGateway', () => {
  let gateway: ReturnType<typeof createShareGateway>
  let baseUrl: string

  beforeAll(async () => {
    gateway = createShareGateway({
      port: 3991,
      password: 'test-secure-pass',
      repos: [process.cwd()]
    })
    await gateway.listen()
    baseUrl = `http://127.0.0.1:${gateway.port}`
  })

  afterAll(async () => {
    if (gateway) {
      await gateway.close()
    }
  })

  it('serves html entrypoint on /s/:id', async () => {
    const res = await fetch(`${baseUrl}/s/${gateway.sessionId}`)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('Twin3 Shared Session Console')
  })

  it('refuses unauthenticated api access', async () => {
    const res = await fetch(`${baseUrl}/api/s/${gateway.sessionId}/status`)
    expect(res.status).toBe(401)
  })

  it('authenticates with correct token and password', async () => {
    const authRes = await fetch(`${baseUrl}/api/s/${gateway.sessionId}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: gateway.token, password: 'test-secure-pass' })
    })
    expect(authRes.status).toBe(200)
    const authData = await authRes.json()
    expect(authData.ok).toBe(true)
    expect(authData.authToken).toBeDefined()

    const statusRes = await fetch(`${baseUrl}/api/s/${gateway.sessionId}/status`, {
      headers: { Authorization: `Bearer ${authData.authToken}` }
    })
    expect(statusRes.status).toBe(200)
    const statusData = await statusRes.json()
    expect(statusData.ok).toBe(true)
    expect(statusData.sessionId).toBe(gateway.sessionId)
    expect(statusData.repos.length).toBeGreaterThan(0)
    expect(statusData.models).toEqual(['claude', 'gemini', 'codex', 'agent'])
  })

  it('refuses wrong password', async () => {
    const authRes = await fetch(`${baseUrl}/api/s/${gateway.sessionId}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: gateway.token, password: 'wrong-pass' })
    })
    expect(authRes.status).toBe(401)
    const authData = await authRes.json()
    expect(authData.ok).toBe(false)
  })

  it('lists files within bound repo', async () => {
    const authRes = await fetch(`${baseUrl}/api/s/${gateway.sessionId}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: gateway.token, password: 'test-secure-pass' })
    })
    const authData = await authRes.json()

    const filesRes = await fetch(`${baseUrl}/api/s/${gateway.sessionId}/files?repoIndex=0`, {
      headers: { Authorization: `Bearer ${authData.authToken}` }
    })
    expect(filesRes.status).toBe(200)
    const filesData = await filesRes.json()
    expect(filesData.ok).toBe(true)
    expect(Array.isArray(filesData.files)).toBe(true)
  })
})
