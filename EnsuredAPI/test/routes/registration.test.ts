import { readFile, rm } from 'fs/promises'
import path from 'path'
import jwt from 'jsonwebtoken'
import { buildApp } from '../../src/app'
import { Document, InvestorProfile, KYCRecord, Organization, User } from '../../src/db/models'
import { initTestDb } from '../helpers/db'

type RegistrationRole = 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker' | 'admin'

type RegistrationTestCase = {
  selectedRole: RegistrationRole
  expectedUserRole: 'investor' | 'insurer' | 'analyst' | 'admin'
  expectedOrganizationType: 'investor_fund' | 'insurer' | 'admin'
  registrationApproach: 'invitation-code' | 'request-access' | 'business-details'
  accountMethod: 'organization-email' | 'username-password' | 'social'
  socialProvider?: 'gmail' | 'facebook' | 'microsoft'
  fullName: string
  emailAddress: string
  organizationName?: string | null
  organizationReference?: string | null
  organizationEmail?: string | null
  username?: string | null
  livenessCompleted?: boolean
}

const storageRoot = path.resolve(process.cwd(), 'storage', 'registration-documents')
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation'

function makeUniqueSeed(role: RegistrationRole): string {
  return `${role}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function withPlusAddress(email: string, seed: string): string {
  const atIndex = email.indexOf('@')
  if (atIndex === -1) {
    return `${email}-${seed}`
  }

  const localPart = email.slice(0, atIndex)
  const domain = email.slice(atIndex)
  return `${localPart}+${seed}${domain}`
}

function buildRegistrationPayload(testCase: RegistrationTestCase) {
  const uniqueSeed = makeUniqueSeed(testCase.selectedRole)
  const businessLegalName =
    testCase.registrationApproach === 'business-details'
      ? `Atlantic Risk Holdings LLC ${uniqueSeed}`
      : null

  return {
    selectedRole: testCase.selectedRole,
    organizationName: testCase.organizationName ? `${testCase.organizationName} ${uniqueSeed}` : null,
    organizationReference: testCase.organizationReference ? `${testCase.organizationReference}-${uniqueSeed}` : null,
    registrationApproach: testCase.registrationApproach,
    accountMethod: testCase.accountMethod,
    socialProvider: testCase.socialProvider ?? null,
    organizationEmail: testCase.organizationEmail ? withPlusAddress(testCase.organizationEmail, uniqueSeed) : null,
    username: testCase.username ? `${testCase.username}.${uniqueSeed.replace(/[^a-zA-Z0-9]/g, '')}` : null,
    businessDetails:
      testCase.registrationApproach === 'business-details'
        ? {
            legalName: businessLegalName,
            registrationNumber: 'ARH-2026-001',
            registeredAddress: '101 Harbor View, New York, NY 10001, USA',
          }
        : null,
    fullName: `${testCase.fullName} ${uniqueSeed.slice(-6)}`,
    dob: '1986-04-19',
    nationality: 'United States',
    residentialAddress: '101 Harbor View, New York, NY 10001, USA',
    phoneNumber: '+1 555 010 3344',
    emailAddress: withPlusAddress(testCase.emailAddress, uniqueSeed),
    livenessCompleted: testCase.livenessCompleted ?? true,
    documents: [
      {
        documentType: 'Government-issued ID',
        fileName: 'kyc-proof.txt',
        mimeType: 'text/plain',
        required: true,
        contentBase64: Buffer.from(`${testCase.selectedRole}-document-a`, 'utf8').toString('base64'),
      },
      {
        documentType: 'Proof of Address',
        fileName: 'kyc-proof.txt',
        mimeType: 'text/plain',
        required: true,
        contentBase64: Buffer.from(`${testCase.selectedRole}-document-b`, 'utf8').toString('base64'),
      },
    ],
  }
}

const registrationCases: RegistrationTestCase[] = [
  {
    selectedRole: 'institutional',
    expectedUserRole: 'investor',
    expectedOrganizationType: 'investor_fund',
    registrationApproach: 'business-details',
    accountMethod: 'username-password',
    organizationName: 'Atlantic Risk Holdings LLC',
    username: 'atlantic.admin',
    fullName: 'Morgan Riskwell',
    emailAddress: 'institutional.registration@ensured.local',
  },
  {
    selectedRole: 'insurer',
    expectedUserRole: 'insurer',
    expectedOrganizationType: 'insurer',
    registrationApproach: 'request-access',
    accountMethod: 'social',
    socialProvider: 'microsoft',
    organizationReference: 'ATLAS-RISK-COLLECTIVE',
    fullName: 'Iris Coverage',
    emailAddress: 'insurer.registration@ensured.local',
  },
  {
    selectedRole: 'underwriter',
    expectedUserRole: 'analyst',
    expectedOrganizationType: 'insurer',
    registrationApproach: 'invitation-code',
    accountMethod: 'organization-email',
    organizationReference: 'ORG-84A1-3XQ7',
    organizationEmail: 'underwriting@ensured.local',
    fullName: 'Theo Underwrite',
    emailAddress: 'underwriter.registration@ensured.local',
  },
  {
    selectedRole: 'claims',
    expectedUserRole: 'analyst',
    expectedOrganizationType: 'insurer',
    registrationApproach: 'request-access',
    accountMethod: 'organization-email',
    organizationReference: 'ATLAS-RISK-COLLECTIVE',
    organizationEmail: 'claims@ensured.local',
    fullName: 'Casey Adjuster',
    emailAddress: 'claims.registration@ensured.local',
  },
  {
    selectedRole: 'broker',
    expectedUserRole: 'analyst',
    expectedOrganizationType: 'insurer',
    registrationApproach: 'invitation-code',
    accountMethod: 'social',
    socialProvider: 'gmail',
    organizationReference: 'BROKER-REF-2026',
    fullName: 'Bailey Broker',
    emailAddress: 'broker.registration@ensured.local',
  },
  {
    selectedRole: 'admin',
    expectedUserRole: 'admin',
    expectedOrganizationType: 'admin',
    registrationApproach: 'business-details',
    accountMethod: 'username-password',
    username: 'platform.admin',
    fullName: 'Avery Admin',
    emailAddress: 'admin.registration@ensured.local',
  },
]

describe('POST /api/registration/complete', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    await initTestDb()
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await rm(storageRoot, { recursive: true, force: true })
  })

  beforeEach(async () => {
    await Document.destroy({ where: {} })
    await KYCRecord.destroy({ where: {} })
    await InvestorProfile.destroy({ where: {} })
    await User.destroy({ where: {} })
    await Organization.destroy({ where: {} })
    await rm(storageRoot, { recursive: true, force: true })
  })

  it.each(registrationCases)('registers a $selectedRole user and stores uploaded documents', async (testCase) => {
    const payload = buildRegistrationPayload(testCase)

    const res = await app.inject({
      method: 'POST',
      url: '/api/registration/complete',
      payload,
    })

    expect(res.statusCode).toBe(201)

    const body = JSON.parse(res.payload) as {
      registrationId: string
      authToken: string
      user: { id: number; email: string; role: string }
      investorProfileId: number | null
      documents: Array<{ documentId: number; documentType: string; fileName: string; storagePath: string; required: boolean }>
    }

    expect(body.user.role).toBe(testCase.expectedUserRole)
    expect(body.authToken).toEqual(expect.any(String))
    expect(body.documents).toHaveLength(2)
    expect(body.documents[0].storagePath).toContain(`storage/registration-documents/${body.registrationId}/`)
    expect(body.documents[0].storagePath).not.toBe(body.documents[1].storagePath)

    const authMeRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: `Bearer ${body.authToken}`,
      },
    })

    expect(authMeRes.statusCode).toBe(200)
    const authMe = JSON.parse(authMeRes.payload) as { id: number; email: string; role: string }
    expect(authMe.email).toBe(payload.emailAddress)
    expect(authMe.role).toBe(testCase.expectedUserRole)

    const decoded = jwt.verify(body.authToken, JWT_SECRET) as { userId?: number; email?: string }
    expect(decoded.userId).toBe(body.user.id)
    expect(decoded.email).toBe(payload.emailAddress)

    const createdUser = await User.findByPk(body.user.id)
    expect(createdUser?.email).toBe(payload.emailAddress)
    expect(createdUser?.role).toBe(testCase.expectedUserRole)

    expect(createdUser?.organizationId).toEqual(expect.any(Number))
    expect(body.user.organizationId).toBe(createdUser?.organizationId)

    const linkedOrganization = await Organization.findByPk(createdUser?.organizationId as number)
    expect(linkedOrganization).not.toBeNull()
    expect(linkedOrganization?.type).toBe(testCase.expectedOrganizationType)
    const expectedOrganizationName =
      payload.organizationReference ??
      payload.organizationName ??
      (typeof payload.businessDetails?.legalName === 'string' ? payload.businessDetails.legalName : null)
    expect(linkedOrganization?.name).toBe(expectedOrganizationName)

    const createdDocuments = await Document.findAll({ where: { entityId: body.user.id, entityType: 'User' } })
    expect(createdDocuments).toHaveLength(2)

    for (const createdDocument of createdDocuments) {
      const relativePath = createdDocument.url
      const absolutePath = path.join(process.cwd(), relativePath)
      const fileContent = await readFile(absolutePath, 'utf8')
      expect(fileContent).toMatch(/document-[ab]/)
      expect(relativePath).toContain(`storage/registration-documents/${body.registrationId}/`)
    }

    if (testCase.expectedUserRole === 'investor') {
      expect(body.investorProfileId).not.toBeNull()

      const investorProfile = await InvestorProfile.findByPk(body.investorProfileId as number)
      expect(investorProfile?.userId).toBe(body.user.id)

      const kycRecord = await KYCRecord.findOne({ where: { investorProfileId: body.investorProfileId } })
      expect(kycRecord).not.toBeNull()
      expect(kycRecord?.status).toBe('pending')
      expect(Array.isArray(kycRecord?.documentsJson)).toBe(true)
      expect(kycRecord?.documentsJson).toHaveLength(2)
    } else {
      expect(body.investorProfileId).toBeNull()
      expect(await InvestorProfile.count({ where: { userId: body.user.id } })).toBe(0)
      expect(await KYCRecord.count()).toBe(0)
    }
  })

  it('rejects incomplete registration payloads', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/registration/complete',
      payload: {
        selectedRole: 'institutional',
        fullName: 'Morgan Riskwell',
        emailAddress: 'missing.documents@ensured.local',
        documents: [],
      },
    })

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.payload)).toEqual({ error: 'missing_documents' })
  })
})