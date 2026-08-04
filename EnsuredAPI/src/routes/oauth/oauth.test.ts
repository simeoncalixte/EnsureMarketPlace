import jwt from 'jsonwebtoken'
import { buildApp } from '../../app'
import { InvestorProfile, Organization, Subscription, User } from '../../db/models'
import { initTestDb } from '../../../test/helpers/db'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation'

/**
 * Social sign-up (Google / Microsoft) in SIMULATED mode — no provider
 * credentials in the environment, so the start endpoint serves the mock
 * consent page and the callback accepts the simulated identity. This keeps the
 * whole suite free of network calls and provider accounts, mirroring the
 * simulated-Stripe pattern. The real code-exchange path is exercised only when
 * GOOGLE/MICROSOFT_OAUTH_CLIENT_ID+SECRET are configured.
 */

let seq = 0
function uniqueEmail(tag: string): string {
  seq += 1
  return `${tag}.${Date.now()}.${seq}@ensured.local`
}

/** Pull the signed state out of the simulated consent page's hidden field. */
function extractState(html: string): string {
  const m = html.match(/name="state" value="([^"]+)"/)
  expect(m).not.toBeNull()
  return m![1]
}

function fragmentParams(location: string): URLSearchParams {
  const hash = location.split('#')[1] ?? ''
  return new URLSearchParams(hash)
}

describe('OAuth social sign-up (simulated providers)', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET
    delete process.env.MICROSOFT_OAUTH_CLIENT_ID
    delete process.env.MICROSOFT_OAUTH_CLIENT_SECRET
    await initTestDb()
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await Subscription.destroy({ where: {} })
    await InvestorProfile.destroy({ where: {} })
    await User.destroy({ where: {} })
    await Organization.destroy({ where: {} })
  })

  async function startAndGetState(provider: 'google' | 'microsoft', query: string): Promise<string> {
    const res = await app.inject({ method: 'GET', url: `/api/auth/oauth/${provider}/start?${query}` })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    return extractState(res.payload)
  }

  it.each(['google', 'microsoft'] as const)(
    'registers a new user through the simulated %s consent flow',
    async (provider) => {
      const email = uniqueEmail(provider)
      const state = await startAndGetState(provider, 'role=insurer&legalName=Atlantic%20Risk&country=US')

      const cb = await app.inject({
        method: 'GET',
        url: `/api/auth/oauth/${provider}/callback?state=${encodeURIComponent(state)}&sim_email=${encodeURIComponent(email)}&sim_name=Morgan%20Riskwell`,
      })
      expect(cb.statusCode).toBe(302)
      const location = cb.headers.location as string
      expect(location).toContain('/auth/social/callback#')

      const params = fragmentParams(location)
      expect(params.get('newAccount')).toBe('1')
      const token = params.get('authToken')!
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string }
      expect(decoded.email).toBe(email)

      const user = await User.findByPk(decoded.userId)
      expect(user).not.toBeNull()
      expect(user!.role).toBe('insurer')
      expect(user!.firstName).toBe('Morgan')
      expect(user!.lastName).toBe('Riskwell')
      // The unusable local password placeholder is a real scrypt hash.
      expect(user!.passwordHash.startsWith('scrypt$')).toBe(true)

      // Same provisioning as password registration: org link + trial subscription.
      expect(user!.organizationId).not.toBeNull()
      const sub = await Subscription.findOne({ where: { userId: user!.id } })
      expect(sub?.status).toBe('trialing')
    },
  )

  it('signs in an existing account instead of duplicating it', async () => {
    const email = uniqueEmail('existing')
    const first = await startAndGetState('google', 'role=broker')
    await app.inject({
      method: 'GET',
      url: `/api/auth/oauth/google/callback?state=${encodeURIComponent(first)}&sim_email=${encodeURIComponent(email)}`,
    })
    expect(await User.count()).toBe(1)

    const second = await startAndGetState('google', 'role=broker')
    const cb = await app.inject({
      method: 'GET',
      url: `/api/auth/oauth/google/callback?state=${encodeURIComponent(second)}&sim_email=${encodeURIComponent(email)}`,
    })
    expect(cb.statusCode).toBe(302)
    const params = fragmentParams(cb.headers.location as string)
    expect(params.get('authToken')).toBeTruthy()
    expect(params.get('newAccount')).toBeNull()
    expect(await User.count()).toBe(1)
  })

  it('rejects a forged or expired state with an error redirect', async () => {
    const cb = await app.inject({
      method: 'GET',
      url: '/api/auth/oauth/google/callback?state=forged&sim_email=a@b.co',
    })
    expect(cb.statusCode).toBe(302)
    expect(cb.headers.location).toContain('error=oauth_state_invalid')
    expect(await User.count()).toBe(0)
  })

  it('requires a role to create a new account', async () => {
    const state = await startAndGetState('google', '')
    const cb = await app.inject({
      method: 'GET',
      url: `/api/auth/oauth/google/callback?state=${encodeURIComponent(state)}&sim_email=${encodeURIComponent(uniqueEmail('norole'))}`,
    })
    expect(cb.statusCode).toBe(302)
    expect(cb.headers.location).toContain('error=oauth_role_required')
    expect(await User.count()).toBe(0)
  })

  it('never lets a social signup claim the admin role (#35)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/oauth/google/start?role=admin' })
    expect(res.statusCode).toBe(403)
    expect(JSON.parse(res.payload).error).toBe('role_not_self_serviceable')
  })

  it('404s on unknown providers', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/oauth/facebook/start?role=insurer' })
    expect(res.statusCode).toBe(404)
  })

  it('constrains the post-auth redirect to trusted origins', async () => {
    const email = uniqueEmail('redirect')
    const state = await startAndGetState('google', `role=insurer&redirect=${encodeURIComponent('https://evil.example.com')}`)
    const cb = await app.inject({
      method: 'GET',
      url: `/api/auth/oauth/google/callback?state=${encodeURIComponent(state)}&sim_email=${encodeURIComponent(email)}`,
    })
    expect(cb.statusCode).toBe(302)
    expect((cb.headers.location as string).startsWith('https://evil.example.com')).toBe(false)
  })
})
