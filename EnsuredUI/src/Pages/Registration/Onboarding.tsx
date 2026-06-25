import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import { useNavigate, useSearchParams } from 'react-router'
import FormField from '../../xds/components/FormField'
import { Button } from '../../xds/components/Button'
import { colors, withAlpha } from '../../xds/colors'
import { spacing, typography } from '../../xds/tokens'
import { completeRegistration } from '../../api/registration'
import { oauthStartUrl, type OAuthProvider } from '../../api/auth'
import { saveAuthToken } from '../../lib/auth'

/**
 * Streamlined onboarding — the lean "Acquire" step.
 *
 * One screen, one decision per block: pick a role, create an account, optionally
 * name your organization. No KYC, no document packs, no payment wall — those are
 * deferred to the moment they are actually needed (see the API's transaction
 * gate). `admin` is deliberately not offered: it is provisioned internally, never
 * self-registered.
 */

type Role = 'insurer' | 'broker' | 'underwriter' | 'institutional' | 'claims'

type RoleOption = {
  id: Role
  title: string
  blurb: string
  accent: string
}

const ROLES: RoleOption[] = [
  { id: 'insurer', title: 'Insurer / MGA', blurb: 'Automate submission intake and place programs.', accent: colors.primary },
  { id: 'broker', title: 'Broker', blurb: 'Submit risks once and track every placement.', accent: colors.dataViz.teal },
  { id: 'underwriter', title: 'Underwriter', blurb: 'A workbench for triage, pricing, and review.', accent: colors.dataViz.amber },
  { id: 'institutional', title: 'Capital provider', blurb: 'Deploy capital into modeled, audited deals.', accent: colors.secondary },
  { id: 'claims', title: 'Claims', blurb: 'Intake events and coordinate settlement.', accent: colors.primarySoft },
]

// Entry points (e.g. the landing "Pick your side of the desk" cards) can
// pre-select a role via `?role=`. Accept the canonical ids plus known aliases —
// the landing page labels capital providers "investor" — and ignore anything else.
const ROLE_ALIASES: Record<string, Role> = { investor: 'institutional' }

function normalizeRole(value: string | null): Role | null {
  if (!value) return null
  const candidate = (ROLE_ALIASES[value] ?? value) as Role
  return ROLES.some((r) => r.id === candidate) ? candidate : null
}

type OrgMode = 'skip' | 'invite' | 'create'

const Page = styled.main`
  max-width: 760px;
  margin: 0 auto;
  padding: ${spacing.xl}px ${spacing.lg}px 64px;
`

const Header = styled.header`
  margin-bottom: ${spacing.xl}px;
`

const Title = styled.h1`
  margin: 0 0 ${spacing.sm}px;
  font-size: ${typography.sizes['2xl']}px;
  color: ${colors.text.primary};
`

const Lede = styled.p`
  margin: 0;
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.md}px;
  line-height: 1.6;
`

const Block = styled.section`
  margin-bottom: ${spacing.xl}px;
`

const BlockLabel = styled.div`
  font-family: ui-monospace, Menlo, monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: ${typography.sizes.xs}px;
  color: ${colors.primarySoft};
  margin-bottom: ${spacing.sm}px;
`

const RoleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${spacing.sm}px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr 1fr;
  }
`

const RoleTile = styled.button<{ $active: boolean; $accent: string }>`
  text-align: left;
  cursor: pointer;
  border-radius: 12px;
  padding: ${spacing.md}px;
  background: ${({ $active, $accent }) => ($active ? withAlpha($accent, 0.12) : colors.surfaceContainerLow)};
  border: 1px solid ${({ $active, $accent }) => ($active ? $accent : colors.outlineVariant)};
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover { border-color: ${({ $accent }) => $accent}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

const RoleTitle = styled.div`
  color: ${colors.text.primary};
  font-weight: 700;
  font-size: ${typography.sizes.sm}px;
  margin-bottom: 4px;
`

const RoleBlurb = styled.div`
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.xs}px;
  line-height: 1.5;
`

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${spacing.md}px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const SegRow = styled.div`
  display: flex;
  gap: ${spacing.sm}px;
  margin-bottom: ${spacing.md}px;
  flex-wrap: wrap;
`

const SegButton = styled.button<{ $active: boolean }>`
  cursor: pointer;
  border-radius: 9999px;
  padding: 6px 14px;
  font-size: ${typography.sizes.sm}px;
  background: ${({ $active }) => ($active ? withAlpha(colors.primary, 0.16) : 'transparent')};
  color: ${({ $active }) => ($active ? colors.text.primary : colors.text.secondary)};
  border: 1px solid ${({ $active }) => ($active ? colors.primary : colors.outlineVariant)};

  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

const ErrorBanner = styled.div`
  border: 1px solid ${colors.danger};
  background: ${withAlpha(colors.danger, 0.1)};
  color: ${colors.text.primary};
  border-radius: 10px;
  padding: ${spacing.sm}px ${spacing.md}px;
  margin-bottom: ${spacing.md}px;
  font-size: ${typography.sizes.sm}px;
`

const SocialDivider = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.md}px;
  margin: ${spacing.md}px 0;
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.xs}px;
  text-transform: uppercase;
  letter-spacing: 1px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${colors.outlineVariant};
  }
`

const SocialRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${spacing.md}px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const SocialButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${spacing.sm}px;
  cursor: pointer;
  border-radius: 10px;
  padding: 10px ${spacing.md}px;
  font-size: ${typography.sizes.sm}px;
  font-weight: 600;
  color: ${colors.text.primary};
  background: ${colors.surfaceContainerLow};
  border: 1px solid ${colors.outlineVariant};
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover { border-color: ${colors.primary}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

const GoogleMark: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
)

const MicrosoftMark: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
    <rect x="1" y="1" width="10" height="10" fill="#F25022" />
    <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
    <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
    <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
  </svg>
)

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.md}px;
  margin-top: ${spacing.lg}px;
`

const Reassure = styled.p`
  margin: ${spacing.md}px 0 0;
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.xs}px;
`

const ERROR_COPY: Record<string, string> = {
  invalid_email: 'Please enter a valid email address.',
  weak_password: 'Use at least 8 characters for your password.',
  email_already_registered: 'An account with this email already exists. Try signing in.',
  role_not_self_serviceable: 'That role can’t be self-registered.',
  passwords_dont_match: 'Passwords do not match.',
  missing_role: 'Choose how you’ll use Ensured to continue.',
  oauth_cancelled: 'Sign-in was cancelled. You can try again or use email and password.',
  oauth_failed: 'We couldn’t complete sign-in with that provider. Please try again.',
  oauth_state_invalid: 'That sign-in link expired. Please try again.',
  oauth_email_unverified: 'Your email isn’t verified with that provider. Verify it there or register with email and password.',
  oauth_role_required: 'Choose how you’ll use Ensured, then continue with Google or Microsoft.',
  account_inactive: 'This account is inactive. Contact support to restore access.',
}

const Onboarding: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Seed from `?role=` so a role chosen on the landing page arrives pre-selected.
  const [role, setRole] = useState<Role | null>(() => normalizeRole(searchParams.get('role')))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [orgMode, setOrgMode] = useState<OrgMode>('skip')
  const [invitationCode, setInvitationCode] = useState('')
  const [legalName, setLegalName] = useState('')
  const [country, setCountry] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Seed from `?error=` so failures during the OAuth round-trip (the API
  // redirects back here with a code) surface in the same banner.
  const [errorCode, setErrorCode] = useState<string | null>(() => searchParams.get('error'))

  const canSubmit = useMemo(
    () => Boolean(role) && email.trim().length > 3 && password.length >= 8 && password === confirm,
    [role, email, password, confirm],
  )

  const handleSubmit = async () => {
    setErrorCode(null)
    if (!role) return setErrorCode('missing_role')
    if (password !== confirm) return setErrorCode('passwords_dont_match')

    const organization =
      orgMode === 'invite' && invitationCode.trim()
        ? { invitationCode: invitationCode.trim() }
        : orgMode === 'create' && legalName.trim()
          ? { legalName: legalName.trim(), country: country.trim() || null }
          : null

    setSubmitting(true)
    try {
      const res = await completeRegistration({
        selectedRole: role,
        email: email.trim(),
        password,
        accountMethod: 'username-password',
        organization,
      })
      if (res.status === 201) {
        const body = (await res.json()) as { authToken?: string }
        if (body.authToken) saveAuthToken(body.authToken)
        navigate('/marketplace')
        return
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      setErrorCode(body.error ?? 'unknown')
    } catch {
      setErrorCode('network')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSocial = (provider: OAuthProvider) => {
    setErrorCode(null)
    if (!role) return setErrorCode('missing_role')
    // Full-page navigation: the API packs role + org into a signed state, walks
    // the provider consent flow, and lands back on /auth/social/callback.
    window.location.assign(
      oauthStartUrl(provider, {
        role,
        invitationCode: orgMode === 'invite' ? invitationCode : undefined,
        legalName: orgMode === 'create' ? legalName : undefined,
        country: orgMode === 'create' ? country : undefined,
      }),
    )
  }

  return (
    <Page>
      <Header>
        <Title>Create your workspace</Title>
        <Lede>A few details and you’re in. No documents or payment up front — set those up later, only when you’re ready to transact.</Lede>
      </Header>

      {errorCode && <ErrorBanner role="alert">{ERROR_COPY[errorCode] ?? 'Something went wrong. Please try again.'}</ErrorBanner>}

      <Block>
        <BlockLabel>How will you use Ensured?</BlockLabel>
        <RoleGrid>
          {ROLES.map((r) => (
            <RoleTile
              key={r.id}
              type="button"
              $active={role === r.id}
              $accent={r.accent}
              aria-pressed={role === r.id}
              onClick={() => setRole(r.id)}
            >
              <RoleTitle>{r.title}</RoleTitle>
              <RoleBlurb>{r.blurb}</RoleBlurb>
            </RoleTile>
          ))}
        </RoleGrid>
      </Block>

      <Block>
        <BlockLabel>Your account</BlockLabel>
        <SocialRow>
          <SocialButton type="button" onClick={() => handleSocial('google')}>
            <GoogleMark />
            Continue with Google
          </SocialButton>
          <SocialButton type="button" onClick={() => handleSocial('microsoft')}>
            <MicrosoftMark />
            Continue with Microsoft
          </SocialButton>
        </SocialRow>
        <SocialDivider>or with email</SocialDivider>
        <FieldRow>
          <FormField
            label="Work email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div />
          <FormField
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={confirm.length > 0 && confirm !== password ? 'Passwords do not match' : undefined}
          />
        </FieldRow>
      </Block>

      <Block>
        <BlockLabel>Organization (optional)</BlockLabel>
        <SegRow role="group" aria-label="Organization setup">
          <SegButton type="button" $active={orgMode === 'skip'} onClick={() => setOrgMode('skip')}>I’ll do this later</SegButton>
          <SegButton type="button" $active={orgMode === 'invite'} onClick={() => setOrgMode('invite')}>I have an invite code</SegButton>
          <SegButton type="button" $active={orgMode === 'create'} onClick={() => setOrgMode('create')}>Set up my organization</SegButton>
        </SegRow>

        {orgMode === 'invite' && (
          <FormField
            label="Invitation code"
            placeholder="ORG-XXXX-XXXX"
            value={invitationCode}
            onChange={(e) => setInvitationCode(e.target.value)}
          />
        )}

        {orgMode === 'create' && (
          <FieldRow>
            <FormField
              label="Legal name"
              placeholder="Atlantic Risk Holdings LLC"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
            <FormField
              label="Country"
              placeholder="United States"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </FieldRow>
        )}
      </Block>

      <Actions>
        <Button variant="primary" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? 'Creating…' : 'Create workspace'}
        </Button>
        <Button variant="text" onClick={() => navigate('/auth/login')}>I already have an account</Button>
      </Actions>
      <Reassure>By continuing you agree to our terms. You can complete verification and choose a plan anytime before your first transaction.</Reassure>
    </Page>
  )
}

export default Onboarding
