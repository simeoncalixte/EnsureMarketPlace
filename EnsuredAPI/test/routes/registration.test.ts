import jwt from 'jsonwebtoken'
import { buildApp } from '../../src/app'
import { Document, InvestorProfile, KYCRecord, Organization, Subscription, User } from '../../src/db/models'
import { initTestDb } from '../helpers/db'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation'

type SelfServiceRole = 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker'

type Case = {
  selectedRole: SelfServiceRole
  expectedUserRole: 'investor' | 'insurer' | 'analyst'
  expectedOrganizationType: 'investor_fund' | 'insurer'
}

const cases: Case[] = [
  { selectedRole: 'institutional', expectedUserRole: 'investor', expectedOrganizationType: 'investor_fund' },
  { selectedRole: 'insurer', expectedUserRole: 'insurer', expectedOrganizationType: 'insurer' },
  { selectedRole: 'underwriter', expectedUserRole: 'analyst', expectedOrganizationType: 'insurer' },
  { selectedRole: 'claims', expectedUserRole: 'analyst', expectedOrganizationType: 'insurer' },
  { selectedRole: 'broker', expectedUserRole: 'analyst', expectedOrganizationType: 'insurer' },
]

let seq = 0
function uniqueEmail(role: string): string {
  seq += 1
  return `${role}.${Date.now()}.${seq}@ensured.local`
}

describe('POST /api/registration/complete (lean onboarding)', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    await initTestDb()
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await Subscription.destroy({ where: {} })
    await Document.destroy({ where: {} })
    await KYCRecord.destroy({ where: {} })
    await InvestorProfile.destroy({ where: {} })
    await User.destroy({ where: {} })
    await Organization.destroy({ where: {} })
  })

  it.each(cases)('registers a $selectedRole user into a trial workspace', async (testCase) => {
    const email = uniqueEmail(testCase.selectedRole)
    const payload = {
      selectedRole: testCase.selectedRole,
      email,
      password: 'correct horse battery',
      fullName: 'Morgan Riskwell',
      organization: { legalName: `Atlantic Risk Holdings ${seq}`, country: 'US' },
    }

    const res = await app.inject({ method: 'POST', url: '/api/registration/complete', payload })
    expect(res.statusCode).toBe(201)

    const body = JSON.parse(res.payload) as {
      authToken: string
      user: { id: number; email: string; role: string; organizationId: number | null }
      investorProfileId: number | null
      trial: { planCode: string; status: string; currentPeriodEnd: string } | null
    }

    // Account created, token committed immediately (no payment wall).
    expect(body.user.role).toBe(testCase.expectedUserRole)
    expect(body.authToken).toEqual(expect.any(String))
    const decoded = jwt.verify(body.authToken, JWT_SECRET) as { userId?: number; email?: string }
    expect(decoded.userId).toBe(body.user.id)

    // No documents or KYC records are created at registration (deferred).
    expect(await Document.count()).toBe(0)
    expect(await KYCRecord.count()).toBe(0)

    // Organization linked from legal name; type follows role.
    const org = await Organization.findByPk(body.user.organizationId as number)
    expect(org?.type).toBe(testCase.expectedOrganizationType)

    // Trial subscription started instead of an up-front charge.
    expect(body.trial?.status).toBe('trialing')
    const sub = await Subscription.findOne({ where: { userId: body.user.id } })
    expect(sub?.status).toBe('trialing')
    expect(sub?.currentPeriodEnd).toBeTruthy()

    // Investors get a profile with KYC pending (gate later); others do not.
    if (testCase.expectedUserRole === 'investor') {
      expect(body.investorProfileId).not.toBeNull()
      const profile = await InvestorProfile.findByPk(body.investorProfileId as number)
      expect(profile?.kycStatus).toBe('pending')
    } else {
      expect(body.investorProfileId).toBeNull()
    }
  })

  it('stores a real password hash, and the chosen password can sign in', async () => {
    const email = uniqueEmail('login')
    const password = 'super secret pw 123'
    const reg = await app.inject({
      method: 'POST',
      url: '/api/registration/complete',
      payload: { selectedRole: 'insurer', email, password, organization: { legalName: `Login Co ${seq}` } },
    })
    expect(reg.statusCode).toBe(201)

    const user = await User.findOne({ where: { email } })
    expect(user?.passwordHash.startsWith('scrypt$')).toBe(true)
    expect(user?.passwordHash).not.toContain('registration:')

    const ok = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } })
    expect(ok.statusCode).toBe(200)
    expect(JSON.parse(ok.payload).authToken).toEqual(expect.any(String))

    const bad = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password: 'wrong' } })
    expect(bad.statusCode).toBe(401)
  })

  it('refuses self-registration as admin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/registration/complete',
      payload: { selectedRole: 'admin', email: uniqueEmail('admin'), password: 'a-strong-password' },
    })
    expect(res.statusCode).toBe(403)
    expect(JSON.parse(res.payload)).toEqual({ error: 'role_not_self_serviceable' })
  })

  it('rejects weak passwords and invalid emails', async () => {
    const weak = await app.inject({
      method: 'POST',
      url: '/api/registration/complete',
      payload: { selectedRole: 'broker', email: uniqueEmail('weak'), password: 'short' },
    })
    expect(weak.statusCode).toBe(400)
    expect(JSON.parse(weak.payload).error).toBe('weak_password')

    const badEmail = await app.inject({
      method: 'POST',
      url: '/api/registration/complete',
      payload: { selectedRole: 'broker', email: 'not-an-email', password: 'a-strong-password' },
    })
    expect(badEmail.statusCode).toBe(400)
    expect(JSON.parse(badEmail.payload).error).toBe('invalid_email')
  })

  it('rejects a duplicate email', async () => {
    const email = uniqueEmail('dupe')
    const payload = { selectedRole: 'broker', email, password: 'a-strong-password' }
    const first = await app.inject({ method: 'POST', url: '/api/registration/complete', payload })
    expect(first.statusCode).toBe(201)
    const second = await app.inject({ method: 'POST', url: '/api/registration/complete', payload })
    expect(second.statusCode).toBe(409)
    expect(JSON.parse(second.payload).error).toBe('email_already_registered')
  })
})
