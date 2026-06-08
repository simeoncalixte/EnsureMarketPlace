import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import Card from '../../xds/components/Card'
import Badge from '../../xds/components/Badge'
import { PageTitle, PageSubtitle } from '../../xds/components/Typography'
import { colors } from '../../xds/colors'

const Wrapper = styled.main`
  min-height: calc(100vh - 64px);
  padding: 40px 32px;
  background: ${colors.surfaceDeep};
  color: ${colors.onSurfaceStrong};
`

const ProfileCard = styled(Card)`
  max-width: 960px;
  margin: 0 auto;
`

const RoleBadgeRow = styled.div`
  margin-bottom: 14px;
`

const Copy = styled(PageSubtitle)`
  max-width: none;
  margin: 12px 0 0;
`

const DetailRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
`

type RoleKey = 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker' | 'admin'

type SocialProvider = 'gmail' | 'facebook' | 'microsoft'

type RegistrationSession = {
  selectedRole?: RoleKey
  organizationName?: string
  organizationLinkMode?: 'invitation-code' | 'request-access' | 'business-details'
  registrationApproach?: 'invitation-code' | 'request-access' | 'business-details'
  accountMethod?: 'organization-email' | 'username-password' | 'social'
  socialProvider?: SocialProvider
  organizationEmail?: string
  username?: string
  businessDetails?: {
    legalName: string
    tradingName: string
    registrationNumber: string
    address: string
    contactEmail: string
    website: string
  }
}

const roleLabel: Record<RoleKey, string> = {
  institutional: 'Institutional Investor',
  insurer: 'Insurer / MGA',
  underwriter: 'Reinsurer / Underwriting Entity',
  claims: 'Claims Handler / Adjuster',
  broker: 'Insurance Agent / Broker',
  admin: 'Platform Admin / UBO Review',
}

const socialProviderLabel: Record<SocialProvider, string> = {
  gmail: 'Gmail',
  facebook: 'Facebook',
  microsoft: 'Microsoft',
}

export default function CapitalProfile() {
  const [role, setRole] = useState<RoleKey | null>(null)
  const [organizationName, setOrganizationName] = useState<string | null>(null)
  const [organizationLinkMode, setOrganizationLinkMode] = useState<RegistrationSession['organizationLinkMode'] | null>(null)
  const [registrationApproach, setRegistrationApproach] = useState<RegistrationSession['registrationApproach'] | null>(null)
  const [accountMethod, setAccountMethod] = useState<RegistrationSession['accountMethod'] | null>(null)
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(null)
  const [organizationEmail, setOrganizationEmail] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const session = window.localStorage.getItem('registrationSession')
    if (!session) {
      return
    }

    try {
      const parsed = JSON.parse(session) as RegistrationSession
      if (parsed.selectedRole && parsed.selectedRole in roleLabel) {
        setRole(parsed.selectedRole)
      }
      if (parsed.organizationName) {
        setOrganizationName(parsed.organizationName)
      }
      if (parsed.organizationLinkMode) {
        setOrganizationLinkMode(parsed.organizationLinkMode)
      }
      if (parsed.registrationApproach) {
        setRegistrationApproach(parsed.registrationApproach)
      } else if (parsed.organizationLinkMode) {
        setRegistrationApproach(parsed.organizationLinkMode)
      }
      if (parsed.accountMethod) {
        setAccountMethod(parsed.accountMethod)
      }
      if (parsed.socialProvider) {
        setSocialProvider(parsed.socialProvider)
      }
      if (parsed.organizationEmail) {
        setOrganizationEmail(parsed.organizationEmail)
      }
      if (parsed.username) {
        setUsername(parsed.username)
      }
    } catch {
      setRole(null)
    }
  }, [])

  const approachLabel =
    registrationApproach === 'business-details'
      ? 'Business details'
      : registrationApproach === 'request-access'
        ? 'Walk-on request'
        : registrationApproach === 'invitation-code'
          ? 'Invitation code'
          : null

  return (
    <Wrapper>
      <ProfileCard>
        <RoleBadgeRow>
          <Badge variant="primary">{role ? roleLabel[role] : 'Registration'}</Badge>
        </RoleBadgeRow>
        <PageTitle>Capital Profile</PageTitle>
        <Copy>
          Your KYC profile, organization structure, and account access are linked. Continue by defining capital preferences, risk bands, and allocation constraints.
        </Copy>
        {(organizationName || organizationLinkMode || approachLabel) && (
          <DetailRow>
            {organizationName && <Badge variant="primary">{organizationName}</Badge>}
            {approachLabel && <Badge variant="tertiary">{approachLabel}</Badge>}
            {organizationLinkMode && (
              <Badge variant="tertiary">
                {organizationLinkMode === 'invitation-code'
                  ? 'Linked by invitation code'
                  : organizationLinkMode === 'business-details'
                    ? 'Business details saved'
                    : 'Requested access'}
              </Badge>
            )}
            {accountMethod && (
              <Badge variant="secondary">
                {accountMethod === 'organization-email'
                  ? 'Connected organization email'
                  : accountMethod === 'social'
                    ? 'Social sign-up'
                    : 'Username/password account'}
              </Badge>
            )}
            {accountMethod === 'social' && socialProvider && <Badge variant="surface">{socialProviderLabel[socialProvider]}</Badge>}
            {accountMethod === 'organization-email' && organizationEmail && <Badge variant="surface">{organizationEmail}</Badge>}
            {accountMethod === 'username-password' && username && <Badge variant="surface">{username}</Badge>}
          </DetailRow>
        )}
      </ProfileCard>
    </Wrapper>
  )
}
