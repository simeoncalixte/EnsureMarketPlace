import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import Card from '../../xds/components/Card'
import FormField from '../../xds/components/FormField'
import SectionHeader from '../../xds/components/SectionHeader'
import DocumentRow from '../../xds/components/DocumentRow'
import ValidationMessage from '../../xds/components/ValidationMessage'
import { Badge } from '../../xds/components/Badge'
import { Button } from '../../xds/components/Button'
import { PageTitle, PageSubtitle, SmallText, SectionSmallTitle } from '../../xds/components/Typography'
import { colors, withAlpha } from '../../xds/colors'
import { spacing, radii, typography } from '../../xds/tokens'
import { getApiBase } from '../../lib/api'
import { completeRegistration } from '../../api/registration'

const Page = styled.main`
  display: flex;
  min-height: 100vh;
  background: ${colors.surfaceDeep};
  color: ${colors.onSurfaceStrong};
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
`;

const Content = styled.section`
  width: 100%;
`;

const TopBar = styled.header`
  background: ${colors.surfaceDeep};
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Container = styled.div`
  padding: 32px;
  max-width: 1120px;
  margin: 0 auto;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 1024px) {
    grid-template-columns: 7fr 5fr;
  }
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
`;

const FieldGrid = styled.div`
  display: grid;
  gap: 12px;
`;

const FullWidthField = styled.div`
  grid-column: 1 / -1;
`;

const CheckGrid = styled.div`
  display: grid;
  gap: ${spacing.sm}px;
`;

const ProfileSubtitle = styled(SmallText)`
  margin-bottom: ${spacing.lg}px;
`;

const LivenessNote = styled(SmallText)`
  margin-bottom: ${spacing.md}px;
`;

const DocCard = styled(Card)`
  margin-top: ${spacing.md}px;
`;

const SecurityCard = styled(Card)`
  padding: 20px;
`;

const TopBarInner = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const Brand = styled.div`
  font-family: Manrope, sans-serif;
  font-weight: 800;
  color: ${colors.text.accent};
`;

const DocList = styled.div`
  display: grid;
  gap: 12px;
`;

const CheckRow = styled.div`
  background: ${withAlpha(colors.surfaceDeep, 0.4)};
  border: 1px solid ${withAlpha(colors.white, 0.05)};
  border-radius: ${radii.md}px;
  padding: 12px ${spacing.md}px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const CheckLabel = styled.div`
  font-weight: 600;
  font-size: 13px;
`;

const RightStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.md}px;
`;

const LivenessHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const LivenessTitle = styled.h3`
  margin: 0;
  font-family: Manrope, sans-serif;
  font-weight: 800;
`;

const CameraFrame = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: ${spacing.lg}px;
  border-radius: ${radii.lg}px;
  background: ${colors.surfaceContainerHigh};
`;

const CameraCircle = styled.div`
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 4px dashed ${colors.outlineVariant};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const CameraEmoji = styled.div`
  font-size: 48px;
  opacity: 0.9;
`;

const CameraCaption = styled(SmallText)`
  text-align: center;
  padding: 0 ${spacing.md}px;
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${spacing.sm}px;
  width: 100%;
`;

const StatusTile = styled.div`
  background: ${colors.surfaceContainerHigh};
  padding: 12px;
  border-radius: ${radii.md}px;
`;

const StatusValue = styled.div`
  font-weight: 700;
`;

const LatencyValue = styled.div`
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.secondary};
  font-weight: 700;
`;

const SecurityRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const SecurityIcon = styled.div`
  color: ${colors.primary};
`;

const SecurityTitle = styled.div`
  font-weight: 700;
`;

const BadgeRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: ${spacing.md}px;
  opacity: 0.6;
  justify-content: space-between;
`;

const CertBadge = styled.div`
  text-align: center;
`;

const CertCircle = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${radii.round}px;
  border: 1px solid ${colors.onSurfaceVariant};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
`;

const CertCaption = styled(SmallText)`
  margin-top: 6px;
  display: block;
`;

const FooterActions = styled.footer`
  margin-top: ${spacing.xl - 8}px;
  padding-top: ${spacing.lg}px;
  border-top: 1px solid ${withAlpha(colors.border, 0.1)};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const FooterBack = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
`;

const FooterSubmit = styled.div`
  display: grid;
  justify-items: end;
  gap: 12px;
`;

const RoleTag = styled.div`
  background: ${withAlpha(colors.primary, 0.15)};
  color: ${colors.primary};
  padding: 6px 12px;
  border-radius: ${radii.sm}px;
  font-size: ${typography.sizes.xs}px;
  font-weight: 700;
  text-transform: capitalize;
`;

type RoleKey = 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker' | 'admin'

type DocStatus = 'verified' | 'required' | 'optional'

type KycDocument = {
  name: string
  description: string
  status: DocStatus
  filename?: string
}

type KycProfile = {
  label: string
  subtitle: string
  documents: KycDocument[]
  checks: string[]
  livenessNote: string
}

const roleProfiles: Record<RoleKey, KycProfile> = {
  institutional: {
    label: 'Institutional Investor',
    subtitle: 'Investor onboarding requires identity, accredited verification, and AML controls.',
    documents: [
      { name: 'Government-issued ID', description: 'Valid International Passport or Government Driver\u2019s License.', status: 'verified', filename: 'passport_scan_v1.pdf' },
      { name: 'Proof of Address', description: 'Utility bill, bank statement, or official correspondence (last 3 months).', status: 'required' },
      { name: 'Articles of Incorporation', description: 'Official legal document establishing your business entity.', status: 'required' },
      { name: 'EIN Confirmation Letter', description: 'IRS CP 575 or 147C notification letter.', status: 'required' },
      { name: 'Operating Agreement', description: 'Key governing document for the entity\u2019s management.', status: 'required' },
      { name: 'Certificate of Good Standing', description: 'Recent certificate from the Secretary of State or equivalent.', status: 'required' },
      { name: 'CPA or Attorney Accredited Investor Letter', description: 'Verification of accredited investor status from a licensed professional.', status: 'required' },
      { name: 'Beneficial Ownership Information (UBO)', description: 'Full breakdown of ownership structure and individual beneficiaries.', status: 'required' },
    ],
    checks: ['OFAC screening', 'PEP list screening', 'Sanctions database screening'],
    livenessNote: 'Required for natural persons and beneficial owners over threshold.',
  },
  insurer: {
    label: 'Insurer / MGA',
    subtitle: 'Carrier onboarding focuses on regulatory authorization and operational standing.',
    documents: [
      { name: 'Government-issued ID', description: 'Valid ID for authorized signatory of the entity.', status: 'required' },
      { name: 'Proof of Address', description: 'Address verification for the authorized signer.', status: 'required' },
      { name: 'Certificate of Incorporation', description: 'Corporate charter or entity formation document.', status: 'required' },
      { name: 'NAIC Number Verification', description: 'National Association of Insurance Commissioners registration number.', status: 'required' },
      { name: 'Certificate of Good Standing', description: 'State-issued certificate confirming active entity status.', status: 'required' },
      { name: 'State Insurance Licenses & DOI Registration', description: 'Active licenses and Department of Insurance registration records.', status: 'required' },
      { name: 'Regulatory Filings', description: 'Recent statutory filings and financial exhibits.', status: 'required' },
      { name: 'Proof of Reinsurance', description: 'Documentation of existing reinsurance arrangements.', status: 'optional' },
      { name: 'A.M. Best or Demotech Rating Report', description: 'Financial strength rating from a recognized rating agency.', status: 'optional' },
    ],
    checks: ['Regulatory status verification with state DOI', 'OFAC screening', 'Sanctions database screening'],
    livenessNote: 'Required for authorized representatives and beneficial owners over threshold.',
  },
  underwriter: {
    label: 'Reinsurer / Underwriting Entity',
    subtitle: 'Reinsurance entities require financial strength and corporate compliance validation.',
    documents: [
      { name: 'Government-issued ID', description: 'Valid ID for the compliance officer or authorized representative.', status: 'required' },
      { name: 'Incorporation Documents', description: 'Legal formation documents for the underwriting entity.', status: 'required' },
      { name: 'Regulatory Registration', description: 'Evidence of registration with applicable regulatory bodies.', status: 'required' },
      { name: 'Financial Statements', description: 'Audited annual financial statements for the past 2 years.', status: 'required' },
      { name: 'Rating Agency Report', description: 'S&P, Moody’s, or Fitch Ratings financial strength report.', status: 'required' },
      { name: 'UBO Disclosure & AML/KYC Review Package', description: 'Beneficial ownership disclosure and AML compliance review documentation.', status: 'required' },
      { name: 'Corporate Governance Documents', description: 'Board resolutions, articles, and entity control documents.', status: 'optional' },
    ],
    checks: ['OFAC screening', 'PEP list screening', 'Sanctions database screening'],
    livenessNote: 'Required for authorized representatives and beneficial owners over threshold.',
  },
  claims: {
    label: 'Claims Handler / Adjuster',
    subtitle: 'Adjuster workflows require license validation and authority checks.',
    documents: [
      { name: 'Government-issued ID', description: 'Valid government-issued identification document.', status: 'required' },
      { name: 'Adjuster License & State Certification', description: 'State-issued adjuster license and certification document.', status: 'required' },
      { name: 'License Number & Validity Proof', description: 'Evidence of current license number and expiration date.', status: 'required' },
      { name: 'Employment Verification', description: 'Employer letter or carrier appointment confirmation.', status: 'required' },
      { name: 'Independent Adjuster Agreement', description: 'Signed agreement if operating as an independent adjuster.', status: 'optional' },
      { name: 'E&O Insurance Certificate', description: 'Errors and omissions insurance certificate.', status: 'optional' },
      { name: 'W-9 & FEMA Certifications', description: 'Required for catastrophe or federal disaster response work.', status: 'optional' },
    ],
    checks: ['License status lookup in state DOI database', 'Sanctions screening'],
    livenessNote: 'Required for licensed professionals and public adjuster scrutiny controls.',
  },
  broker: {
    label: 'Insurance Agent / Broker',
    subtitle: 'Producer onboarding needs identity, license, authority, and carrier appointment proof.',
    documents: [
      { name: 'Government-issued ID', description: 'Valid government-issued identification document.', status: 'required' },
      { name: 'Producer License', description: 'State-issued producer or broker license.', status: 'required' },
      { name: 'NPN (National Producer Number)', description: 'NIPR-issued National Producer Number.', status: 'required' },
      { name: 'Appointment Letters', description: 'Letters of appointment from authorized carriers.', status: 'required' },
      { name: 'Carrier Contracts', description: 'Executed distribution and placement agreements.', status: 'required' },
      { name: 'Agency License', description: 'Agency-level license if operating as a licensed agency.', status: 'optional' },
      { name: 'EIN Documentation', description: 'Federal employer identification documentation for the agency.', status: 'optional' },
    ],
    checks: ['License status verification', 'OFAC screening', 'Sanctions database screening'],
    livenessNote: 'Required for producer identity assurance and fraud prevention.',
  },
  admin: {
    label: 'Platform Admin / UBO Review',
    subtitle: 'Admin onboarding applies enhanced beneficial ownership and AML controls.',
    documents: [
      { name: 'Government-issued ID', description: 'Valid government-issued identification document.', status: 'required' },
      { name: 'Proof of Address', description: 'Utility bill, bank statement, or official correspondence.', status: 'required' },
      { name: 'Ownership Structure Chart', description: 'Organizational chart of all owners and beneficial parties.', status: 'required' },
      { name: 'IDs for Owners Above Threshold', description: 'Government-issued IDs for all owners above the 25% beneficial ownership threshold.', status: 'required' },
      { name: 'Corporate Control Documents', description: 'Articles, operating agreements, and board resolutions.', status: 'required' },
      { name: 'Signed Representation Agreements', description: 'For public adjuster flows and authority representations (if applicable).', status: 'optional' },
    ],
    checks: ['Enhanced AML/UBO review', 'OFAC screening', 'PEP list screening'],
    livenessNote: 'Required for privileged access onboarding and beneficial owner validation.',
  },
}

const fallbackProfile: KycProfile = {
  label: 'User',
  subtitle: 'Provide baseline identity and compliance documentation.',
  documents: [
    { name: 'Government-issued ID', description: 'Valid government-issued identification document.', status: 'required' },
    { name: 'Proof of Address', description: 'Utility bill, bank statement, or official correspondence.', status: 'required' },
    { name: 'AML/KYC Intake Form', description: 'Completed AML and Know Your Customer intake form.', status: 'required' },
  ],
  checks: ['OFAC screening', 'Sanctions database screening'],
  livenessNote: 'Required for default onboarding policy.',
}

type IdentityFieldKey =
  | 'fullName'
  | 'dob'
  | 'nationality'
  | 'residentialAddress'
  | 'phoneNumber'
  | 'emailAddress'

type IdentityErrors = Partial<Record<IdentityFieldKey, string>>

type RegistrationSession = {
  selectedRole?: RoleKey
  organizationName?: string
  organizationLinkMode?: 'invitation-code' | 'request-access' | 'business-details'
  registrationApproach?: 'invitation-code' | 'request-access' | 'business-details'
  accountMethod?: 'organization-email' | 'username-password' | 'social'
  socialProvider?: 'gmail' | 'facebook' | 'microsoft'
  organizationEmail?: string
  username?: string
  businessDetails?: Record<string, unknown>
  organizationReference?: string
  pendingAuthToken?: string
  backendRegistrationId?: string
  backendUserId?: number
  backendPersistedAt?: string
}

type UploadedDocument = {
  fileName: string
  file: File
}

function readRegistrationSession(): RegistrationSession {
  if (typeof window === 'undefined') {
    return {}
  }

  const raw = window.localStorage.getItem('registrationSession')
  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(raw) as RegistrationSession
  } catch {
    return {}
  }
}

function writeRegistrationSession(patch: Partial<RegistrationSession>) {
  if (typeof window === 'undefined') {
    return
  }

  const current = readRegistrationSession()
  window.localStorage.setItem(
    'registrationSession',
    JSON.stringify({
      ...current,
      ...patch,
      backendPersistedAt: patch.backendPersistedAt ?? current.backendPersistedAt,
      updatedAt: new Date().toISOString(),
    }),
  )
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read uploaded file'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  })

  const commaIndex = dataUrl.indexOf(',')
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1)
}

export default function KYCVerification() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null)
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [nationality, setNationality] = useState('')
  const [residentialAddress, setResidentialAddress] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, UploadedDocument>>({})
  const [livenessCompleted, setLivenessCompleted] = useState(false)
  const [identityErrors, setIdentityErrors] = useState<IdentityErrors>({})
  const [documentErrors, setDocumentErrors] = useState<Record<string, string>>({})
  const [livenessError, setLivenessError] = useState('')
  const [registrationError, setRegistrationError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const session = window.localStorage.getItem('registrationSession')
    if (session) {
      try {
        const parsed = JSON.parse(session) as { selectedRole?: RoleKey }
        if (parsed.selectedRole && parsed.selectedRole in roleProfiles) {
          setSelectedRole(parsed.selectedRole)
        }
      } catch (e) {
        console.error('Failed to parse registration session', e)
      }
    }
  }, [])

  const profile = useMemo(() => {
    if (!selectedRole) {
      return fallbackProfile
    }

    return roleProfiles[selectedRole]
  }, [selectedRole])

  const requiredDocuments = useMemo(
    () => profile.documents.filter((doc) => doc.status === 'required'),
    [profile.documents],
  )

  const handleUpload = (docName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setUploadedDocuments((current) => ({
      ...current,
      [docName]: {
        fileName: file.name,
        file,
      },
    }))
    setDocumentErrors((current) => {
      if (!current[docName]) {
        return current
      }

      const next = { ...current }
      delete next[docName]
      return next
    })
  }

  const handleContinue = async () => {
    const nextIdentityErrors: IdentityErrors = {}
    if (fullName.trim().length === 0) nextIdentityErrors.fullName = 'Full legal name is required.'
    if (dob.trim().length === 0) nextIdentityErrors.dob = 'Date of birth is required.'
    if (nationality.trim().length === 0) nextIdentityErrors.nationality = 'Nationality or citizenship is required.'
    if (residentialAddress.trim().length === 0) nextIdentityErrors.residentialAddress = 'Residential address is required.'
    if (phoneNumber.trim().length === 0) nextIdentityErrors.phoneNumber = 'Phone number is required.'
    if (emailAddress.trim().length === 0) nextIdentityErrors.emailAddress = 'Email address is required.'

    setIdentityErrors(nextIdentityErrors)

    const missingRequiredDocs = requiredDocuments.filter((doc) => !uploadedDocuments[doc.name])
    const nextDocumentErrors = missingRequiredDocs.reduce<Record<string, string>>((acc, doc) => {
      acc[doc.name] = `Upload is required for ${doc.name}.`
      return acc
    }, {})

    setDocumentErrors(nextDocumentErrors)

    const nextLivenessError = livenessCompleted ? '' : 'Complete liveness detection to continue.'
    setLivenessError(nextLivenessError)

    if (Object.keys(nextIdentityErrors).length > 0) {
      return
    }

    if (missingRequiredDocs.length > 0) {
      return
    }

    if (!livenessCompleted) {
      return
    }

    const apiBase = getApiBase()
    if (!apiBase) {
      navigate('/auth/register/organization-structure')
      return
    }

    setIsSubmitting(true)
    setRegistrationError('')

    try {
      const session = readRegistrationSession()
      const documents = await Promise.all(
        requiredDocuments.map(async (doc) => {
          const upload = uploadedDocuments[doc.name]
          return {
            documentType: doc.name,
            fileName: upload.fileName,
            mimeType: upload.file.type || 'application/octet-stream',
            required: doc.status === 'required',
            contentBase64: await fileToBase64(upload.file),
          }
        }),
      )

      const response = await completeRegistration({
          selectedRole: selectedRole ?? session.selectedRole,
          organizationName: session.organizationName ?? null,
          organizationReference: session.organizationReference ?? null,
          registrationApproach: session.registrationApproach ?? session.organizationLinkMode ?? null,
          accountMethod: session.accountMethod ?? null,
          socialProvider: session.socialProvider ?? null,
          organizationEmail: session.organizationEmail ?? null,
          username: session.username ?? null,
          businessDetails: session.businessDetails ?? null,
          fullName,
          dob,
          nationality,
          residentialAddress,
          phoneNumber,
          emailAddress,
          livenessCompleted,
          documents,
      })

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(errorBody.error || `Registration failed with status ${response.status}`)
      }

      const result = (await response.json().catch(() => ({}))) as { registrationId?: string; authToken?: string; user?: { id?: number } }
      // Park the token in the registration session rather than committing it to
      // auth storage: committing it now would flip the app into the authenticated
      // state and bypass the subscription paywall. The payment step commits it on
      // a successful charge (see SubscriptionPlan.enterMarketplace).
      writeRegistrationSession({
        pendingAuthToken: result.authToken,
        backendRegistrationId: result.registrationId,
        backendUserId: result.user?.id,
        backendPersistedAt: new Date().toISOString(),
      })

      navigate('/auth/register/subscription', { replace: true })
    } catch (error) {
      setRegistrationError(error instanceof Error ? error.message : 'Unable to submit registration to the backend.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Page>
      <Content>
        <TopBar>
          <TopBarInner>
            <Brand>Sovereign Re</Brand>
            <RoleTag>{profile.label}</RoleTag>
          </TopBarInner>
          <div>
            <Button variant="primary" size="sm">Institutional Login</Button>
          </div>
        </TopBar>

        <Container>
          <PageTitle>Identity Verification</PageTitle>
          <PageSubtitle>
            To ensure the integrity of the Sovereign Re ecosystem and comply with global reinsurance regulations, please provide verified identification details.
          </PageSubtitle>
          <ProfileSubtitle>{profile.subtitle}</ProfileSubtitle>

          <Grid>
            <div>
              <Card>
                <SectionHeader
                  icon="🔖"
                  title="Personal Identity"
                  subtitle="Core identity fields required for all applicants."
                />

                <FieldGrid>
                  <FullWidthField>
                    <FormField
                      label="Legal Full Name"
                      placeholder="As it appears on your passport"
                      aria-label="Legal Full Name"
                      value={fullName}
                      onChange={(event) => {
                        setFullName(event.target.value)
                        setIdentityErrors((current) => ({ ...current, fullName: undefined }))
                      }}
                      error={identityErrors.fullName}
                    />
                  </FullWidthField>
                  <FieldRow>
                    <div>
                      <FormField
                        label="Date of Birth"
                        placeholder="YYYY-MM-DD"
                        aria-label="Date of Birth"
                        value={dob}
                        onChange={(event) => {
                          setDob(event.target.value)
                          setIdentityErrors((current) => ({ ...current, dob: undefined }))
                        }}
                        error={identityErrors.dob}
                      />
                    </div>
                    <div>
                      <FormField
                        label="Nationality / Citizenship"
                        placeholder="Country of citizenship"
                        aria-label="Nationality / Citizenship"
                        value={nationality}
                        onChange={(event) => {
                          setNationality(event.target.value)
                          setIdentityErrors((current) => ({ ...current, nationality: undefined }))
                        }}
                        error={identityErrors.nationality}
                      />
                    </div>
                  </FieldRow>
                  <FullWidthField>
                    <FormField
                      label="Residential Address"
                      placeholder="Street, city, state, postal code, country"
                      aria-label="Residential Address"
                      value={residentialAddress}
                      onChange={(event) => {
                        setResidentialAddress(event.target.value)
                        setIdentityErrors((current) => ({ ...current, residentialAddress: undefined }))
                      }}
                      error={identityErrors.residentialAddress}
                    />
                  </FullWidthField>
                  <FieldRow>
                    <div>
                      <FormField
                        label="Phone Number"
                        placeholder="+1 555 000 1234"
                        type="tel"
                        aria-label="Phone Number"
                        value={phoneNumber}
                        onChange={(event) => {
                          setPhoneNumber(event.target.value)
                          setIdentityErrors((current) => ({ ...current, phoneNumber: undefined }))
                        }}
                        error={identityErrors.phoneNumber}
                      />
                    </div>
                    <div>
                      <FormField
                        label="Email Address"
                        placeholder="name@company.com"
                        type="email"
                        aria-label="Email Address"
                        value={emailAddress}
                        onChange={(event) => {
                          setEmailAddress(event.target.value)
                          setIdentityErrors((current) => ({ ...current, emailAddress: undefined }))
                        }}
                        error={identityErrors.emailAddress}
                      />
                    </div>
                  </FieldRow>
                </FieldGrid>
              </Card>

              <DocCard>
                <SectionHeader
                  icon="📋"
                  title="Verification & Document Submission"
                  subtitle="Provide required documentation for institutional verification."
                />

                <DocList>
                  {profile.documents.map((doc) => (
                    <DocumentRow
                      key={doc.name}
                      title={doc.name}
                      description={doc.description}
                      docStatus={doc.status}
                      uploaded={!!uploadedDocuments[doc.name]}
                      uploadedFilename={uploadedDocuments[doc.name]?.fileName || doc.filename}
                      onUpload={(event) => handleUpload(doc.name, event)}
                      ariaLabel={`Upload ${doc.name}`}
                      error={documentErrors[doc.name]}
                    />
                  ))}
                </DocList>

                {profile.checks.length > 0 && (
                  <>
                    <SectionSmallTitle>Compliance Checks</SectionSmallTitle>
                    <CheckGrid>
                      {profile.checks.map((check) => (
                        <CheckRow key={check}>
                          <CheckLabel>{check}</CheckLabel>
                          <Badge variant="primary">Automated</Badge>
                        </CheckRow>
                      ))}
                    </CheckGrid>
                  </>
                )}
              </DocCard>
            </div>

            <RightStack>
              <Card elevated>
                <LivenessHeader>
                  <LivenessTitle>Liveness Detection</LivenessTitle>
                  <Badge variant="secondary">Required</Badge>
                </LivenessHeader>

                <LivenessNote>{profile.livenessNote}</LivenessNote>

                <CameraFrame>
                  <CameraCircle>
                    <CameraEmoji>🙂</CameraEmoji>
                    <CameraCaption>Center your face in the frame and ensure adequate lighting</CameraCaption>
                  </CameraCircle>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setLivenessCompleted(true)
                      setLivenessError('')
                    }}
                    type="button"
                  >
                    {livenessCompleted ? 'Camera Verified' : 'Start Camera'}
                  </Button>

                  {livenessError && <ValidationMessage>{livenessError}</ValidationMessage>}

                  <StatusGrid>
                    <StatusTile>
                      <SmallText>STATUS</SmallText>
                      <StatusValue>{livenessCompleted ? 'Completed' : 'Awaiting Input'}</StatusValue>
                    </StatusTile>
                    <StatusTile>
                      <SmallText>LATENCY</SmallText>
                      <LatencyValue>24ms</LatencyValue>
                    </StatusTile>
                  </StatusGrid>
                </CameraFrame>
              </Card>

              <SecurityCard>
                <SecurityRow>
                  <SecurityIcon>🔐</SecurityIcon>
                  <div>
                    <SecurityTitle>Military-Grade Security</SecurityTitle>
                    <SmallText>All identity data is encrypted via AES-256 and stored in disconnected cold-vault environments.</SmallText>
                  </div>
                </SecurityRow>

                <BadgeRow>
                  <CertBadge>
                    <CertCircle>GDPR</CertCircle>
                    <CertCaption>Compliant</CertCaption>
                  </CertBadge>
                  <CertBadge>
                    <CertCircle>SOC2</CertCircle>
                    <CertCaption>Certified</CertCaption>
                  </CertBadge>
                  <CertBadge>
                    <CertCircle>ISO</CertCircle>
                    <CertCaption>27001</CertCaption>
                  </CertBadge>
                </BadgeRow>
              </SecurityCard>
            </RightStack>
          </Grid>

          <FooterActions>
            <FooterBack>
              <div>←</div>
              <SmallText>Previous Step</SmallText>
            </FooterBack>
            <FooterSubmit>
              {registrationError && <ValidationMessage>{registrationError}</ValidationMessage>}
              <Button variant="primary" disabled={isSubmitting} onClick={() => { void handleContinue() }} type="button">
                {isSubmitting ? 'Registering...' : 'Proceed to Capital Profiling →'}
              </Button>
            </FooterSubmit>
          </FooterActions>
        </Container>
      </Content>
    </Page>
  )
}
