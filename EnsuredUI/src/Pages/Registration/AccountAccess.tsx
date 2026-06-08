import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import Card from '../../xds/components/Card'
import FormField from '../../xds/components/FormField'
import Badge from '../../xds/components/Badge'
import SectionHeader from '../../xds/components/SectionHeader'
import { SmallText } from '../../xds/components/Typography'
import RegistrationStepLayout from './RegistrationStepLayout'
import { colors, withAlpha } from '../../xds/colors'

const SpacedCard = styled(Card)`
  margin-bottom: 16px;
`

const MethodGrid = styled.div`
  display: grid;
  gap: 12px;

  @media (min-width: 960px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const MethodCard = styled.button<{ $active?: boolean }>`
  display: grid;
  gap: 10px;
  text-align: left;
  color: inherit;
  border-radius: 14px;
  border: 1px solid ${(props) => (props.$active ? withAlpha(colors.primary, 0.7) : withAlpha(colors.white, 0.06))};
  background: ${(props) => (props.$active ? withAlpha(colors.primary, 0.08) : withAlpha(colors.surfaceDeep, 0.48))};
  padding: 18px;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s, background 0.2s;

  &:hover {
    transform: translateY(-1px);
    border-color: ${withAlpha(colors.primary, 0.38)};
  }
`

const MethodEyebrow = styled.div`
  color: ${colors.outline};
  font-family: monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`

const MethodTitle = styled.div`
  color: ${colors.primaryContainer};
  font-size: 16px;
  font-weight: 800;
`

const MethodCopy = styled.div`
  color: ${colors.onSurfaceMuted};
  font-size: 13px;
  line-height: 1.5;
`

const ProviderGrid = styled.div`
  display: grid;
  gap: 10px;

  @media (min-width: 840px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const ProviderCard = styled.button<{ $active?: boolean; $accent: string }>`
  display: grid;
  gap: 8px;
  text-align: left;
  color: inherit;
  border-radius: 14px;
  border: 1px solid ${(props) => (props.$active ? props.$accent : withAlpha(colors.white, 0.06))};
  background: ${(props) => (props.$active ? withAlpha(colors.primary, 0.08) : withAlpha(colors.surfaceDeep, 0.36))};
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s, background 0.2s;

  &:hover {
    transform: translateY(-1px);
    border-color: ${(props) => props.$accent};
  }
`

const ProviderTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const ProviderBadge = styled.span<{ $accent: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 9px;
  background: ${(props) => `${props.$accent}1a`};
  color: ${(props) => props.$accent};
  font-size: 14px;
  font-weight: 900;
`

const ProviderTitle = styled.div`
  color: ${colors.primaryContainer};
  font-size: 14px;
  font-weight: 800;
`

const ProviderCopy = styled.div`
  color: ${colors.onSurfaceMuted};
  font-size: 12px;
  line-height: 1.45;
`

const SectionBody = styled.div`
  display: grid;
  gap: 14px;
`

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
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

type AccountAccessMethod = 'organization-email' | 'username-password' | 'social'

type SocialProvider = 'gmail' | 'facebook' | 'microsoft'

type RegistrationSession = {
  currentStep?: string
  selectedRole?: RoleKey
  registrationApproach?: RegistrationApproach
  organizationLinkMode?: RegistrationApproach
  organizationName?: string
  organizationReference?: string
  invitationCode?: string
  businessDetails?: {
    legalName: string
    tradingName: string
    registrationNumber: string
    address: string
    contactEmail: string
    website: string
  }
  accountMethod?: AccountAccessMethod
  socialProvider?: SocialProvider
  organizationEmail?: string
  username?: string
  updatedAt?: string
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

const accountMethodLabel: Record<AccountAccessMethod, string> = {
  'organization-email': 'Organization email',
  'username-password': 'Username and password',
  social: 'Social sign-up',
}

const socialProviderLabel: Record<SocialProvider, string> = {
  gmail: 'Gmail',
  facebook: 'Facebook',
  microsoft: 'Microsoft',
}

const socialProviderCopy: Record<SocialProvider, string> = {
  gmail: 'Use your Gmail account to finish registration.',
  facebook: 'Use your Facebook account to finish registration.',
  microsoft: 'Use your Microsoft account to finish registration.',
}

const socialProviderGlyph: Record<SocialProvider, string> = {
  gmail: 'G',
  facebook: 'f',
  microsoft: 'M',
}

const socialProviderAccent: Record<SocialProvider, string> = {
  gmail: colors.vendor.googleRed,
  facebook: colors.vendor.facebookBlue,
  microsoft: colors.vendor.microsoftBlue,
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
      updatedAt: new Date().toISOString(),
    }),
  )
}

export default function AccountAccess() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null)
  const [registrationApproach, setRegistrationApproach] = useState<RegistrationApproach>('invitation-code')
  const [organizationName, setOrganizationName] = useState('')
  const [organizationReference, setOrganizationReference] = useState('')
  const [accountMethod, setAccountMethod] = useState<AccountAccessMethod>('organization-email')
  const [socialProvider, setSocialProvider] = useState<SocialProvider>('gmail')
  const [organizationEmail, setOrganizationEmail] = useState('')
  const [organizationEmailError, setOrganizationEmailError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')

  useEffect(() => {
    const session = readRegistrationSession()
    if (session.selectedRole && session.selectedRole in roleLabel) {
      setSelectedRole(session.selectedRole)
    }

    const resolvedApproach = session.registrationApproach ?? session.organizationLinkMode
    if (resolvedApproach) {
      setRegistrationApproach(resolvedApproach)
    }

    if (session.organizationName) {
      setOrganizationName(session.organizationName)
    }

    if (session.organizationReference) {
      setOrganizationReference(session.organizationReference)
    }

    if (session.accountMethod) {
      setAccountMethod(session.accountMethod)
      if (session.accountMethod === 'social') {
        setSocialProvider(session.socialProvider ?? 'gmail')
      }
    } else if ((session.registrationApproach ?? session.organizationLinkMode) === 'business-details') {
      setAccountMethod('username-password')
    } else {
      setAccountMethod('organization-email')
    }

    if (session.organizationEmail) {
      setOrganizationEmail(session.organizationEmail)
    }

    if (session.username) {
      setUsername(session.username)
    }
  }, [])

  const roleTag = useMemo(() => {
    if (!selectedRole) {
      return 'Registration'
    }

    return roleLabel[selectedRole]
  }, [selectedRole])

  const recommendedMethod = useMemo(() => {
    if (registrationApproach === 'business-details') {
      return 'username-password'
    }

    return 'organization-email'
  }, [registrationApproach])

  const handleMethodSelect = (method: AccountAccessMethod) => {
    setAccountMethod(method)
    setOrganizationEmailError('')
    setUsernameError('')
    setPasswordError('')
    setConfirmPasswordError('')
  }

  const handleSocialProviderSelect = (provider: SocialProvider) => {
    setAccountMethod('social')
    setSocialProvider(provider)
    setOrganizationEmailError('')
    setUsernameError('')
    setPasswordError('')
    setConfirmPasswordError('')
  }

  const handleContinue = () => {
    if (accountMethod === 'organization-email') {
      const trimmedEmail = organizationEmail.trim()
      if (!trimmedEmail) {
        setOrganizationEmailError('Organization email address is required.')
        return
      }

      if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
        setOrganizationEmailError('Enter a valid organization email address.')
        return
      }

      setOrganizationEmailError('')
      writeRegistrationSession({
        currentStep: 'capital-profile',
        accountMethod: 'organization-email',
        organizationEmail: trimmedEmail,
      })
      navigate('/auth/register/capital-profile')
      return
    }

    if (accountMethod === 'social') {
      writeRegistrationSession({
        currentStep: 'capital-profile',
        accountMethod: 'social',
        socialProvider,
      })
      navigate('/auth/register/capital-profile')
      return
    }

    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      setUsernameError('Username is required.')
      return
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.')
      return
    }

    setUsernameError('')
    setPasswordError('')
    setConfirmPasswordError('')

    writeRegistrationSession({
      currentStep: 'capital-profile',
      accountMethod: 'username-password',
      username: trimmedUsername,
    })
    navigate('/auth/register/capital-profile')
  }

  const selectedMethodTitle =
    accountMethod === 'organization-email'
      ? 'Connect organization email'
      : accountMethod === 'social'
        ? `Continue with ${socialProviderLabel[socialProvider]}`
        : 'Create username and password'

  const continueLabel =
    accountMethod === 'organization-email'
      ? 'Connect Email and Continue'
      : accountMethod === 'social'
        ? `Continue with ${socialProviderLabel[socialProvider]}`
        : 'Create Account and Continue'

  return (
    <RegistrationStepLayout
      roleTag={roleTag}
      stepNumber={4}
      title="Account Access"
      subtitle="Connect your organization email, create username and password, or sign up with Gmail, Facebook, or Microsoft to finish registration."
      note="Your earlier registration choice determines the recommended path, but you can switch methods at any time."
      backLabel="Back to Organization Structure"
      onBack={() => navigate('/auth/register/organization-structure')}
      continueLabel={continueLabel}
      onContinue={handleContinue}
      continueNote="This completes the account setup step before capital profiling."
    >
      <div>
        <SpacedCard>
          <SectionHeader
            icon="🔐"
            title="Choose access method"
            subtitle="Select the way you want to finish the account step."
          />

          <MethodGrid>
            <MethodCard
              type="button"
              $active={accountMethod === 'organization-email'}
              aria-pressed={accountMethod === 'organization-email'}
              aria-label="Connect organization email"
              onClick={() => handleMethodSelect('organization-email')}
            >
              <MethodEyebrow>Recommended for linked organizations</MethodEyebrow>
              <MethodTitle>Connect organization email</MethodTitle>
              <MethodCopy>Use the organization inbox to receive a secure connection link and confirm the registration.</MethodCopy>
            </MethodCard>

            <MethodCard
              type="button"
              $active={accountMethod === 'username-password'}
              aria-pressed={accountMethod === 'username-password'}
              aria-label="Sign up with username and password"
              onClick={() => handleMethodSelect('username-password')}
            >
              <MethodEyebrow>Recommended for direct business registration</MethodEyebrow>
              <MethodTitle>Sign up with username and password</MethodTitle>
              <MethodCopy>Create local credentials for the platform and continue through the registration workflow.</MethodCopy>
            </MethodCard>

            <MethodCard
              type="button"
              $active={accountMethod === 'social'}
              aria-pressed={accountMethod === 'social'}
              aria-label="Sign up with Gmail, Facebook, or Microsoft"
              onClick={() => handleMethodSelect('social')}
            >
              <MethodEyebrow>Fast sign-up</MethodEyebrow>
              <MethodTitle>Use a social account</MethodTitle>
              <MethodCopy>Sign up with Gmail, Facebook, or Microsoft and continue without creating a local password.</MethodCopy>
            </MethodCard>
          </MethodGrid>
        </SpacedCard>

        <Card>
          <SectionHeader
            icon={accountMethod === 'organization-email' ? '✉️' : accountMethod === 'social' ? '🌐' : '🧾'}
            title={selectedMethodTitle}
            subtitle={
              accountMethod === 'organization-email'
                ? 'Verify the organization inbox that should receive access.'
                : accountMethod === 'social'
                  ? 'Choose Gmail, Facebook, or Microsoft to finish the sign-up.'
                  : 'Create a username and password for the new account.'
            }
          />

          {accountMethod === 'organization-email' ? (
            <SectionBody>
              <FormField
                label="Organization email address"
                placeholder="name@company.com"
                type="email"
                aria-label="Organization email address"
                value={organizationEmail}
                onChange={(event) => {
                  setOrganizationEmail(event.target.value)
                  if (organizationEmailError) {
                    setOrganizationEmailError('')
                  }
                }}
                error={organizationEmailError}
              />
              <SmallText>We'll send a secure access link to this inbox.</SmallText>
            </SectionBody>
          ) : accountMethod === 'social' ? (
            <SectionBody>
              <ProviderGrid>
                {(['gmail', 'facebook', 'microsoft'] as SocialProvider[]).map((provider) => {
                  const accent = socialProviderAccent[provider]

                  return (
                    <ProviderCard
                      key={provider}
                      type="button"
                      $active={socialProvider === provider}
                      $accent={accent}
                      aria-pressed={socialProvider === provider}
                      aria-label={`Sign up with ${socialProviderLabel[provider]}`}
                      onClick={() => handleSocialProviderSelect(provider)}
                    >
                      <ProviderTopRow>
                        <ProviderBadge $accent={accent}>{socialProviderGlyph[provider]}</ProviderBadge>
                        <ProviderTitle>{socialProviderLabel[provider]}</ProviderTitle>
                      </ProviderTopRow>
                      <ProviderCopy>{socialProviderCopy[provider]}</ProviderCopy>
                    </ProviderCard>
                  )
                })}
              </ProviderGrid>
              <SmallText>No password is stored for this path. We will redirect you through the selected provider flow.</SmallText>
            </SectionBody>
          ) : (
            <SectionBody>
              <FieldRow>
                <FormField
                  label="Username"
                  placeholder="Choose a username"
                  aria-label="Username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    if (usernameError) {
                      setUsernameError('')
                    }
                  }}
                  error={usernameError}
                />
                <FormField
                  label="Password"
                  placeholder="Minimum 8 characters"
                  type="password"
                  aria-label="Password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (passwordError) {
                      setPasswordError('')
                    }
                    if (confirmPasswordError) {
                      setConfirmPasswordError('')
                    }
                  }}
                  error={passwordError}
                />
              </FieldRow>
              <FormField
                label="Confirm password"
                placeholder="Re-enter password"
                type="password"
                aria-label="Confirm password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  if (confirmPasswordError) {
                    setConfirmPasswordError('')
                  }
                }}
                error={confirmPasswordError}
              />
              <SmallText>Password must be at least 8 characters and match the confirmation field.</SmallText>
            </SectionBody>
          )}
        </Card>
      </div>

      <Card>
        <SectionHeader
          icon="🧭"
          title="Registration summary"
          subtitle="This captures the organization context you already completed."
        />

        <SummaryList>
          <KeyValueRow>
            <KeyValueIndex>1</KeyValueIndex>
            Role: {selectedRole ? roleLabel[selectedRole] : 'Not selected'}
          </KeyValueRow>
          <KeyValueRow>
            <KeyValueIndex>2</KeyValueIndex>
            Organization: {organizationName || 'Not set'}
          </KeyValueRow>
          <KeyValueRow>
            <KeyValueIndex>3</KeyValueIndex>
            Path: {approachLabel[registrationApproach]}
          </KeyValueRow>
          <KeyValueRow>
            <KeyValueIndex>4</KeyValueIndex>
            Recommended access: {accountMethodLabel[recommendedMethod]}
          </KeyValueRow>
          {accountMethod === 'social' && (
            <KeyValueRow>
              <KeyValueIndex>5</KeyValueIndex>
              Provider: {socialProviderLabel[socialProvider]}
            </KeyValueRow>
          )}
        </SummaryList>

        <LinkStateCard>
          <Badge variant="secondary">{accountMethodLabel[accountMethod]}</Badge>
          {accountMethod === 'social' && <Badge variant="surface">{socialProviderLabel[socialProvider]}</Badge>}
          <SmallText>
            {accountMethod === 'organization-email'
              ? 'A secure link will be sent to the organization email address you provide.'
              : accountMethod === 'social'
                ? `You will be redirected through ${socialProviderLabel[socialProvider]} to complete sign-up.`
              : 'Username and password credentials will be saved for the new account.'}
          </SmallText>
          {organizationReference && (
            <SmallText>
              Reference: <strong>{organizationReference}</strong>
            </SmallText>
          )}
        </LinkStateCard>
      </Card>
    </RegistrationStepLayout>
  )
}
