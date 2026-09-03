import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import Card from '../../xds/components/Card'
import FormField from '../../xds/components/FormField'
import Badge from '../../xds/components/Badge'
import Button from '../../xds/components/Button'
import ValidationMessage from '../../xds/components/ValidationMessage'
import SectionHeader from '../../xds/components/SectionHeader'
import { SmallText } from '../../xds/components/Typography'
import RegistrationStepLayout from './RegistrationStepLayout'
import { colors, withAlpha } from '../../xds/colors'

const SpacedCard = styled(Card)`
  margin-bottom: 16px;
`

const ApproachGrid = styled.div`
  display: grid;
  gap: 12px;

  @media (min-width: 960px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const ApproachCard = styled.button<{ $active?: boolean }>`
  display: grid;
  gap: 10px;
  text-align: left;
  color: inherit;
  border-radius: 14px;
  border: 1px solid ${(props) => (props.$active ? withAlpha(colors.primary, 0.7) : withAlpha(colors.onSurface, 0.06))};
  background: ${(props) => (props.$active ? withAlpha(colors.primary, 0.08) : withAlpha(colors.surfaceDeep, 0.48))};
  padding: 18px;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s, background 0.2s;

  &:hover {
    transform: translateY(-1px);
    border-color: ${withAlpha(colors.primary, 0.38)};
  }
`

const ApproachEyebrow = styled.div`
  color: ${colors.outline};
  font-family: monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`

const ApproachTitle = styled.div`
  color: ${colors.primaryContainer};
  font-size: 16px;
  font-weight: 800;
`

const ApproachDescription = styled.div`
  color: ${colors.onSurfaceMuted};
  font-size: 13px;
  line-height: 1.5;
`

const SectionBody = styled.div`
  display: grid;
  gap: 14px;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const BusinessFields = styled.div`
  display: grid;
  gap: 12px;
`

const OrganizationGrid = styled.div`
  display: grid;
  gap: 12px;
`

const OrganizationCard = styled.button<{ $active?: boolean }>`
  width: 100%;
  text-align: left;
  border-radius: 14px;
  border: 1px solid ${(props) => (props.$active ? withAlpha(colors.primary, 0.7) : withAlpha(colors.onSurface, 0.06))};
  background: ${(props) => (props.$active ? withAlpha(colors.primary, 0.08) : withAlpha(colors.surfaceDeep, 0.48))};
  padding: 18px;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s, background 0.2s;

  &:hover {
    transform: translateY(-1px);
    border-color: ${withAlpha(colors.primary, 0.38)};
  }
`

const OrganizationCardTop = styled.div`
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
`

const OrganizationName = styled.div`
  font-weight: 800;
  font-size: 16px;
  color: ${colors.primaryContainer};
`

const OrganizationMeta = styled.div`
  margin-top: 4px;
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
`

const OrganizationFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  color: ${colors.outline};
  font-size: 12px;
  font-weight: 700;
`

const SummaryList = styled.div`
  display: grid;
  gap: 10px;
`

/**
 * Page-local numbered key/value row composite (not a design-system primitive).
 * Renders an index pill followed by the row content.
 */
const KeyValueRow = styled.div`
  display: flex;
  align-items: start;
  gap: 10px;
  color: ${colors.onSurfaceMuted};
  font-size: 13px;
  line-height: 1.5;
`

const KeyValueIndex = styled.span`
  display: inline-flex;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: ${withAlpha(colors.primary, 0.12)};
  color: ${colors.primarySoft};
  font-size: 12px;
  font-weight: 800;
`

const LinkStateCard = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 12px;
  padding: 16px;
  border-radius: 12px;
  background: ${withAlpha(colors.primary, 0.08)};
  border: 1px solid ${withAlpha(colors.primary, 0.2)};
`

type RoleKey = 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker' | 'admin'

type RegistrationApproach = 'invitation-code' | 'request-access' | 'business-details'

type BusinessDetails = {
  legalName: string
  tradingName: string
  registrationNumber: string
  address: string
  contactEmail: string
  website: string
}

type BusinessErrors = Partial<Record<keyof BusinessDetails, string>>

type RegistrationSession = {
  selectedRole?: RoleKey
  currentStep?: string
  registrationApproach?: RegistrationApproach
  organizationLinkMode?: RegistrationApproach
  organizationName?: string
  organizationReference?: string
  invitationCode?: string
  businessDetails?: BusinessDetails
  updatedAt?: string
}

type OrganizationCandidate = {
  id: string
  name: string
  focus: string
  summary: string
  status: string
  responseTime: string
}

const roleLabel: Record<RoleKey, string> = {
  institutional: 'Institutional Investor',
  insurer: 'Insurer / MGA',
  underwriter: 'Reinsurer / Underwriting Entity',
  claims: 'Claims Handler / Adjuster',
  broker: 'Insurance Agent / Broker',
  admin: 'Platform Admin / UBO Review',
}

const approachLabel: Record<RegistrationApproach, string> = {
  'invitation-code': 'Invitation code',
  'request-access': 'Request access',
  'business-details': 'Business details',
}

const walkOnOrganizations: OrganizationCandidate[] = [
  {
    id: 'atlas-risk-collective',
    name: 'Atlas Risk Collective',
    focus: 'Commercial lines distribution and program management',
    summary: 'Open to walk-on candidates for regional underwriting, placement support, and partner onboarding.',
    status: 'Open to walk-on candidates',
    responseTime: 'Typical response within 2 business days',
  },
  {
    id: 'meridian-underwriting-group',
    name: 'Meridian Underwriting Group',
    focus: 'Specialty treaty and facultative underwriting',
    summary: 'Inviting licensed professionals who want to join an active underwriting bench and portfolio support team.',
    status: 'Open to walk-on candidates',
    responseTime: 'Typical response within 1 business day',
  },
  {
    id: 'harbor-claims-network',
    name: 'Harbor Claims Network',
    focus: 'Claims operations and catastrophe response',
    summary: 'Seeking adjusters and claims managers who can work immediately on a staffed project basis.',
    status: 'Open to walk-on candidates',
    responseTime: 'Typical response within 12 hours',
  },
]

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
      updatedAt: new Date().toISOString(),
    }),
  )
}

export default function OrganizationStructure() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null)
  const [registrationApproach, setRegistrationApproach] = useState<RegistrationApproach>('invitation-code')
  const [invitationCode, setInvitationCode] = useState('')
  const [invitationError, setInvitationError] = useState('')
  const [requestAccessError, setRequestAccessError] = useState('')
  const [businessErrors, setBusinessErrors] = useState<BusinessErrors>({})
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>({
    legalName: '',
    tradingName: '',
    registrationNumber: '',
    address: '',
    contactEmail: '',
    website: '',
  })
  const [linkedOrganization, setLinkedOrganization] = useState<{
    mode: RegistrationApproach
    name: string
    reference: string
  } | null>(null)

  useEffect(() => {
    const session = readRegistrationSession()
    if (session.selectedRole && session.selectedRole in roleLabel) {
      setSelectedRole(session.selectedRole)
    }

    if (session.registrationApproach) {
      setRegistrationApproach(session.registrationApproach)
    } else if (session.organizationLinkMode) {
      setRegistrationApproach(session.organizationLinkMode)
    }

    if (session.organizationName && session.organizationReference && session.organizationLinkMode) {
      setLinkedOrganization({
        mode: session.organizationLinkMode,
        name: session.organizationName,
        reference: session.organizationReference,
      })
      setInvitationCode(session.invitationCode ?? '')
    }

    if (session.businessDetails) {
      setBusinessDetails((current) => ({
        ...current,
        ...session.businessDetails,
      }))
    }
  }, [])

  const roleTag = useMemo(() => {
    if (!selectedRole) {
      return 'Registration'
    }

    return roleLabel[selectedRole]
  }, [selectedRole])

  const handleInvitationLink = () => {
    const normalizedCode = invitationCode.trim().toUpperCase()
    if (!normalizedCode) {
      setInvitationError('Enter an invitation code to link an organization.')
      return
    }

    if (!/^[A-Z0-9-]{6,}$/.test(normalizedCode)) {
      setInvitationError('Invitation code should include at least 6 letters or numbers.')
      return
    }

    setInvitationError('')
    setRequestAccessError('')
    const organizationName = `Organization linked with ${normalizedCode}`
    const nextState = {
      mode: 'invitation-code' as const,
      name: organizationName,
      reference: normalizedCode,
    }
    setLinkedOrganization(nextState)
    writeRegistrationSession({
      currentStep: 'organization-structure',
      registrationApproach: 'invitation-code',
      organizationLinkMode: nextState.mode,
      organizationName: nextState.name,
      organizationReference: nextState.reference,
      invitationCode: normalizedCode,
    })
  }

  const handleApproachSelect = (approach: RegistrationApproach) => {
    setRegistrationApproach(approach)
    setInvitationError('')
    setRequestAccessError('')
    setBusinessErrors({})
  }

  const handleRequestAccess = (organization: OrganizationCandidate) => {
    const nextState = {
      mode: 'request-access' as const,
      name: organization.name,
      reference: organization.id,
    }
    setRegistrationApproach('request-access')
    setLinkedOrganization(nextState)
    setInvitationError('')
    setRequestAccessError('')
    writeRegistrationSession({
      currentStep: 'organization-structure',
      registrationApproach: 'request-access',
      organizationLinkMode: nextState.mode,
      organizationName: nextState.name,
      organizationReference: nextState.reference,
    })
  }

  const handleBusinessFieldChange = (field: keyof BusinessDetails, value: string) => {
    setBusinessDetails((current) => ({ ...current, [field]: value }))
    setBusinessErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleBusinessContinue = () => {
    const nextErrors: BusinessErrors = {}

    if (!businessDetails.legalName.trim()) {
      nextErrors.legalName = 'Business legal name is required.'
    }

    if (!businessDetails.registrationNumber.trim()) {
      nextErrors.registrationNumber = 'Registration number is required.'
    }

    if (!businessDetails.address.trim()) {
      nextErrors.address = 'Registered address is required.'
    }

    if (!businessDetails.contactEmail.trim()) {
      nextErrors.contactEmail = 'Business contact email is required.'
    }

    setBusinessErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return false
    }

    const legalName = businessDetails.legalName.trim()
    const registrationNumber = businessDetails.registrationNumber.trim()
    const payload: BusinessDetails = {
      legalName,
      tradingName: businessDetails.tradingName.trim(),
      registrationNumber,
      address: businessDetails.address.trim(),
      contactEmail: businessDetails.contactEmail.trim(),
      website: businessDetails.website.trim(),
    }

    const nextState = {
      mode: 'business-details' as const,
      name: legalName,
      reference: registrationNumber,
    }

    setLinkedOrganization(nextState)
    writeRegistrationSession({
      currentStep: 'organization-structure',
      registrationApproach: 'business-details',
      organizationLinkMode: 'business-details',
      organizationName: legalName,
      organizationReference: registrationNumber,
      businessDetails: payload,
    })

    return true
  }

  const handleContinue = () => {
    if (registrationApproach === 'invitation-code') {
      const normalizedCode = invitationCode.trim().toUpperCase()
      if (!normalizedCode) {
        setInvitationError('Enter an invitation code to link an organization.')
        return
      }

      if (!/^[A-Z0-9-]{6,}$/.test(normalizedCode)) {
        setInvitationError('Invitation code should include at least 6 letters or numbers.')
        return
      }

      const nextState = {
        mode: 'invitation-code' as const,
        name: `Organization linked with ${normalizedCode}`,
        reference: normalizedCode,
      }
      setLinkedOrganization(nextState)
      writeRegistrationSession({
        currentStep: 'organization-structure',
        registrationApproach: 'invitation-code',
        organizationLinkMode: nextState.mode,
        organizationName: nextState.name,
        organizationReference: nextState.reference,
        invitationCode: normalizedCode,
      })
        writeRegistrationSession({ currentStep: 'account-access' })
        navigate('/auth/register/account-access')
      return
    }

    if (registrationApproach === 'request-access') {
      if (!linkedOrganization || linkedOrganization.mode !== 'request-access') {
        setRequestAccessError('Select an organization open to walk-on candidates before continuing.')
        return
      }

      writeRegistrationSession({
        currentStep: 'organization-structure',
        registrationApproach: 'request-access',
        organizationLinkMode: 'request-access',
        organizationName: linkedOrganization.name,
        organizationReference: linkedOrganization.reference,
      })
      writeRegistrationSession({ currentStep: 'account-access' })
      navigate('/auth/register/account-access')
      return
    }

    if (registrationApproach === 'business-details') {
      if (!handleBusinessContinue()) {
        return
      }

      writeRegistrationSession({ currentStep: 'account-access' })
      navigate('/auth/register/account-access')
    }
  }

  return (
    <RegistrationStepLayout
      roleTag={roleTag}
      stepNumber={3}
      title="Organization Structure"
      subtitle="Link your verified KYC profile to an organization, request access to a team, or enter your own business details if you are registering directly."
      note="Choose the registration path that matches your operating model. You can always return and change it before continuing."
      backLabel="Back to KYC"
      onBack={() => navigate('/auth/register/kyc')}
      continueLabel="Continue to Account Access"
      onContinue={handleContinue}
      continueNote="You can continue once your selected registration approach is validated."
    >
      <div>
        <SpacedCard>
          <SectionHeader
            icon="🧭"
            title="Choose your registration approach"
            subtitle="Pick the path that best matches how you register and operate."
          />

          <ApproachGrid>
            <ApproachCard type="button" $active={registrationApproach === 'invitation-code'} aria-pressed={registrationApproach === 'invitation-code'} aria-label="Use invitation code" onClick={() => handleApproachSelect('invitation-code')}>
              <ApproachEyebrow>Join existing organization</ApproachEyebrow>
              <ApproachTitle>Invitation code</ApproachTitle>
              <ApproachDescription>Enter a code from your organization to link your verified KYC profile instantly.</ApproachDescription>
            </ApproachCard>

            <ApproachCard type="button" $active={registrationApproach === 'request-access'} aria-pressed={registrationApproach === 'request-access'} aria-label="Request access to an open organization" onClick={() => handleApproachSelect('request-access')}>
              <ApproachEyebrow>Walk-on candidate</ApproachEyebrow>
              <ApproachTitle>Request access</ApproachTitle>
              <ApproachDescription>Request a place with organizations that are open to walk-on candidates.</ApproachDescription>
            </ApproachCard>

            <ApproachCard type="button" $active={registrationApproach === 'business-details'} aria-pressed={registrationApproach === 'business-details'} aria-label="Register with business details" onClick={() => handleApproachSelect('business-details')}>
              <ApproachEyebrow>Register your own business</ApproachEyebrow>
              <ApproachTitle>Business details</ApproachTitle>
              <ApproachDescription>Enter your company information if you are registering directly as a business.</ApproachDescription>
            </ApproachCard>
          </ApproachGrid>
        </SpacedCard>

        {registrationApproach === 'invitation-code' && (
          <SpacedCard>
            <SectionHeader
              icon="🔗"
              title="Link an organization"
              subtitle="Use an invitation code to connect your registration."
            />

            <SectionBody>
              <FormField
                label="Invitation Code"
                placeholder="Example: ORG-84A1-3XQ7"
                aria-label="Invitation Code"
                value={invitationCode}
                onChange={(event) => {
                  setInvitationCode(event.target.value)
                  if (invitationError) {
                    setInvitationError('')
                  }
                }}
                error={invitationError}
              />

              <ActionRow>
                <Button type="button" variant="primary" onClick={handleInvitationLink}>
                  Link Organization
                </Button>
                <Button type="button" variant="outline" onClick={() => setInvitationCode('')}>
                  Clear Code
                </Button>
              </ActionRow>

              {linkedOrganization?.mode === 'invitation-code' && (
                <LinkStateCard>
                  <Badge variant="secondary">Linked</Badge>
                  <SmallText>
                    Invitation code <strong>{linkedOrganization.reference}</strong> is linked to your registration.
                  </SmallText>
                </LinkStateCard>
              )}
            </SectionBody>
          </SpacedCard>
        )}

        {registrationApproach === 'request-access' && (
          <Card>
            <SectionHeader
              icon="🏢"
              title="Open organizations"
              subtitle="Walk-on candidates can request access to these active teams."
            />

            {requestAccessError && <ValidationMessage>{requestAccessError}</ValidationMessage>}

            <OrganizationGrid>
              {walkOnOrganizations.map((organization) => {
                const isActive = linkedOrganization?.mode === 'request-access' && linkedOrganization.reference === organization.id

                return (
                  <OrganizationCard
                    key={organization.id}
                    type="button"
                    aria-pressed={isActive}
                    $active={isActive}
                    onClick={() => handleRequestAccess(organization)}
                  >
                    <OrganizationCardTop>
                      <div>
                        <OrganizationName>{organization.name}</OrganizationName>
                        <OrganizationMeta>{organization.focus}</OrganizationMeta>
                      </div>
                      <Badge variant="tertiary">{organization.status}</Badge>
                    </OrganizationCardTop>

                    <SmallText>{organization.summary}</SmallText>

                    <OrganizationFooter>
                      <span>{organization.responseTime}</span>
                      <span>Request access →</span>
                    </OrganizationFooter>
                  </OrganizationCard>
                )
              })}
            </OrganizationGrid>

            {linkedOrganization?.mode === 'request-access' && (
              <LinkStateCard>
                <Badge variant="secondary">Access request sent</Badge>
                <SmallText>
                  Request submitted for <strong>{linkedOrganization.name}</strong>. You can continue while this is reviewed.
                </SmallText>
              </LinkStateCard>
            )}
          </Card>
        )}

        {registrationApproach === 'business-details' && (
          <Card>
            <SectionHeader
              icon="🏢"
              title="Business details"
              subtitle="Enter your business details if you are registering directly as an organization."
            />

            <BusinessFields>
              <FieldRow>
                <FormField
                  label="Business legal name"
                  placeholder="Atlantic Risk Holdings LLC"
                  aria-label="Business legal name"
                  value={businessDetails.legalName}
                  onChange={(event) => handleBusinessFieldChange('legalName', event.target.value)}
                  error={businessErrors.legalName}
                />
                <FormField
                  label="Trading name"
                  placeholder="Optional trading name"
                  aria-label="Trading name"
                  value={businessDetails.tradingName}
                  onChange={(event) => handleBusinessFieldChange('tradingName', event.target.value)}
                />
              </FieldRow>

              <FieldRow>
                <FormField
                  label="Registration number"
                  placeholder="Company registration, EIN, or registry number"
                  aria-label="Registration number"
                  value={businessDetails.registrationNumber}
                  onChange={(event) => handleBusinessFieldChange('registrationNumber', event.target.value)}
                  error={businessErrors.registrationNumber}
                />
                <FormField
                  label="Business contact email"
                  placeholder="ops@company.com"
                  type="email"
                  aria-label="Business contact email"
                  value={businessDetails.contactEmail}
                  onChange={(event) => handleBusinessFieldChange('contactEmail', event.target.value)}
                  error={businessErrors.contactEmail}
                />
              </FieldRow>

              <FormField
                label="Registered business address"
                placeholder="Street, city, state, postal code, country"
                aria-label="Registered business address"
                value={businessDetails.address}
                onChange={(event) => handleBusinessFieldChange('address', event.target.value)}
                error={businessErrors.address}
              />

              <FormField
                label="Website"
                placeholder="Optional website"
                aria-label="Website"
                value={businessDetails.website}
                onChange={(event) => handleBusinessFieldChange('website', event.target.value)}
              />

              <SmallText>
                Business details are saved with your registration session and will be attached to the next account access step.
              </SmallText>
            </BusinessFields>
          </Card>
        )}
      </div>

      <Card>
        <SectionHeader
          icon="🧭"
          title="What happens next"
          subtitle="The organization structure step connects your KYC identity to the right workflow."
        />

        <SummaryList>
          <KeyValueRow>
            <KeyValueIndex>1</KeyValueIndex>
            Select invitation code, request access, or business details depending on how you register.
          </KeyValueRow>
          <KeyValueRow>
            <KeyValueIndex>2</KeyValueIndex>
            Your selected approach is saved to the registration session for the next step.
          </KeyValueRow>
          <KeyValueRow>
            <KeyValueIndex>3</KeyValueIndex>
            Continue to account access after your selected approach is validated.
          </KeyValueRow>
        </SummaryList>

        {linkedOrganization && (
          <LinkStateCard>
            <Badge variant="primary">Ready to continue</Badge>
            <Badge variant="tertiary">{approachLabel[registrationApproach]}</Badge>
            <SmallText>
              Linked organization: <strong>{linkedOrganization.name}</strong>
            </SmallText>
          </LinkStateCard>
        )}
      </Card>
    </RegistrationStepLayout>
  )
}
