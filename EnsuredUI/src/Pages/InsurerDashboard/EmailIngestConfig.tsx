import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { getApiBase } from '../../lib/api'
import * as S from './InsurerDashboard.styles'

type Provider = 'google' | 'microsoft'

type SyncFrequency = 'realtime' | '5min' | '15min' | '1hour'

interface ConnectedAccount {
  provider: Provider
  email: string
  folder: string
  lastSync: string
  healthy: boolean
}

const SEED_ACCOUNTS: ConnectedAccount[] = [
  {
    provider: 'google',
    email: 'ingest@sovereign-cap.io',
    folder: 'INBOX/submissions',
    lastSync: '2m ago',
    healthy: true,
  },
  {
    provider: 'microsoft',
    email: 'risk-ingest@sovereigncap.com',
    folder: 'Inbox/RiskData',
    lastSync: '14m ago',
    healthy: true,
  },
  {
    provider: 'google',
    email: 'legacy-feed@sovereign-cap.io',
    folder: 'INBOX',
    lastSync: '3h ago',
    healthy: false,
  },
]

const SCOPES_GOOGLE = [
  {
    icon: 'mail',
    color: '#4285f4',
    name: 'Read Mail (readonly)',
    desc: 'Allows the pipeline to read incoming messages and extract submission attachments.',
  },
  {
    icon: 'label',
    color: '#34a853',
    name: 'Manage Labels',
    desc: 'Apply processing labels (e.g. "Ingested", "Failed") after a message is consumed.',
  },
  {
    icon: 'person',
    color: '#fbbc05',
    name: 'Basic Profile',
    desc: 'Read the authenticated account email address for audit logging.',
  },
]

const SCOPES_MICROSOFT = [
  {
    icon: 'mail',
    color: '#00a4ef',
    name: 'Mail.Read',
    desc: 'Read messages from the watched mailbox folder.',
  },
  {
    icon: 'category',
    color: '#7fba00',
    name: 'MailboxSettings.ReadWrite',
    desc: 'Configure auto-reply rules and folder routing for processed items.',
  },
  {
    icon: 'person',
    color: '#f25022',
    name: 'User.Read',
    desc: 'Read the signed-in account profile for audit trail enrichment.',
  },
]

const PROVIDER_CONFIG = {
  google: {
    label: 'Google Workspace',
    sublabel: 'Gmail / Google Workspace SSO',
    logo: '✉️',
    bg: 'linear-gradient(135deg,#4285f4,#34a853)',
    accent: '#4285f4',
    scopes: SCOPES_GOOGLE,
  },
  microsoft: {
    label: 'Microsoft 365',
    sublabel: 'Outlook / Exchange SSO',
    logo: '📧',
    bg: 'linear-gradient(135deg,#00a4ef,#7fba00)',
    accent: '#00a4ef',
    scopes: SCOPES_MICROSOFT,
  },
} as const

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <S.ToggleLabel onClick={onChange}>
      <S.ToggleTrack $checked={checked}>
        <S.ToggleKnob $checked={checked} />
      </S.ToggleTrack>
    </S.ToggleLabel>
  )
}

export default function EmailIngestConfig(): JSX.Element {
  const { channelId } = useParams() as { channelId?: string }
  const [channelLabel, setChannelLabel] = useState<string | null>(null)
  const [provider, setProvider] = useState<Provider>('google')
  const [scopeEnabled, setScopeEnabled] = useState([true, true, true])
  const [folder, setFolder] = useState('INBOX/submissions')
  const [subjectFilter, setSubjectFilter] = useState('SUBJ:risk-submission')
  const [frequency, setFrequency] = useState<SyncFrequency>('realtime')
  const [connecting, setConnecting] = useState(false)
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(SEED_ACCOUNTS)

  const cfg = PROVIDER_CONFIG[provider]

  function handleConnect() {
    setConnecting(true)
    // Simulate OAuth redirect + callback
    setTimeout(() => {
      setAccounts((prev) => [
        {
          provider,
          email: provider === 'google' ? 'new-account@sovereign-cap.io' : 'new-account@sovereigncap.com',
          folder,
          lastSync: 'Just now',
          healthy: true,
        },
        ...prev,
      ])
      setConnecting(false)
    }, 1800)
  }

  function handleRevoke(idx: number) {
    setAccounts((prev) => prev.filter((_, i) => i !== idx))
  }

  useEffect(() => {
    if (!channelId) return
    const base = getApiBase()
    fetch(`${base}/api/ingestion-channels/${channelId}`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error('Not found'); return r.json() })
      .then((data) => {
        if (data?.label) setChannelLabel(data.label)
        if (typeof data?.meta === 'string') setFolder(String(data.meta))
        if (data?.config) {
          if (data.config.folder) setFolder(String(data.config.folder))
        }
      })
      .catch(() => {})
  }, [channelId])

  const freqOptions: { value: SyncFrequency; label: string }[] = [
    { value: 'realtime', label: 'Real-time (push)' },
    { value: '5min',     label: 'Poll every 5 min' },
    { value: '15min',    label: 'Poll every 15 min' },
    { value: '1hour',    label: 'Poll every 1 hour' },
  ]

  return (
    <S.PageShell>
      {/* Breadcrumb */}
      <S.Breadcrumb aria-label="breadcrumb">
        <S.BreadcrumbItem>Ingestion</S.BreadcrumbItem>
        <S.BreadcrumbSep aria-hidden>›</S.BreadcrumbSep>
        <S.BreadcrumbItem>Channels</S.BreadcrumbItem>
        <S.BreadcrumbSep aria-hidden>›</S.BreadcrumbSep>
        <S.BreadcrumbActive>{channelLabel ?? 'Email SSO'}</S.BreadcrumbActive>
      </S.Breadcrumb>

      {/* Header */}
      <S.EmailPageHeader>
        <S.EmailPageTitle>Email Ingestion via SSO</S.EmailPageTitle>
        <S.EmailPageDesc>
          Connect Google Workspace or Microsoft 365 accounts using OAuth 2.0 SSO permissions.
          Sovereign Cap will read designated mailbox folders and route incoming submissions
          directly into the processing pipeline — no credentials stored.
        </S.EmailPageDesc>
      </S.EmailPageHeader>

      <S.EmailGrid>

        {/* ── Provider selection ── */}
        <S.ProviderRow>
          {(['google', 'microsoft'] as Provider[]).map((p) => {
            const c = PROVIDER_CONFIG[p]
            return (
              <S.ProviderCard
                key={p}
                $selected={provider === p}
                $accent={c.accent}
                onClick={() => setProvider(p)}
                type="button"
                aria-pressed={provider === p}
              >
                <S.ProviderLogo $bg={c.bg}>{c.logo}</S.ProviderLogo>
                <div>
                  <S.ProviderName>{c.label}</S.ProviderName>
                  <S.ProviderMeta>{c.sublabel}</S.ProviderMeta>
                </div>
                <S.ProviderCheckmark $accent={c.accent} $visible={provider === p}>
                  check
                </S.ProviderCheckmark>
              </S.ProviderCard>
            )
          })}
        </S.ProviderRow>

        {/* ── OAuth connect panel ── */}
        <S.OAuthPanel>
          <S.OAuthPanelTitle>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '1.125rem', color: '#adc6ff' }}
            >
              lock
            </span>
            OAuth 2.0 Permissions — {cfg.label}
          </S.OAuthPanelTitle>

          <S.OAuthScopes>
            {cfg.scopes.map((scope, i) => (
              <S.ScopeRow key={scope.name}>
                <S.ScopeIcon $color={scope.color}>{scope.icon}</S.ScopeIcon>
                <S.ScopeText>
                  <S.ScopeName>{scope.name}</S.ScopeName>
                  <S.ScopeDesc>{scope.desc}</S.ScopeDesc>
                </S.ScopeText>
                <S.ScopeToggleWrap>
                  <Toggle
                    checked={scopeEnabled[i]}
                    onChange={() =>
                      setScopeEnabled((prev) =>
                        prev.map((v, idx) => (idx === i ? !v : v)),
                      )
                    }
                  />
                </S.ScopeToggleWrap>
              </S.ScopeRow>
            ))}
          </S.OAuthScopes>

          <S.ConnectBtn
            $provider={connecting ? 'disabled' : provider}
            type="button"
            onClick={handleConnect}
            disabled={connecting}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              {connecting ? 'sync' : 'login'}
            </span>
            {connecting
              ? 'Redirecting to SSO…'
              : `Connect ${cfg.label} Account`}
          </S.ConnectBtn>

          <S.SecurityNote>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '0.875rem', flexShrink: 0, marginTop: 1 }}
            >
              shield
            </span>
            Sovereign Cap uses read-only OAuth scopes. No passwords are stored. Access can be
            revoked at any time from your provider's security settings or the table below.
          </S.SecurityNote>
        </S.OAuthPanel>

        {/* ── Filter settings panel ── */}
        <S.FilterPanel>
          <S.FilterPanelTitle>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '1.125rem', color: '#adc6ff' }}
            >
              filter_alt
            </span>
            Inbox Filter Settings
          </S.FilterPanelTitle>

          <S.FilterFieldGroup>
            {/* Folder */}
            <div>
              <S.FieldLabel htmlFor="email-folder">Watch Folder</S.FieldLabel>
              <S.Input
                id="email-folder"
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="e.g. INBOX/submissions"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
              />
            </div>

            {/* Subject filter */}
            <div>
              <S.FieldLabel htmlFor="email-subject">Subject Filter</S.FieldLabel>
              <S.Input
                id="email-subject"
                type="text"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                placeholder="e.g. SUBJ:risk-submission"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
              />
            </div>

            {/* Sync frequency */}
            <div>
              <S.FieldLabel>Sync Frequency</S.FieldLabel>
              <S.RadioGroup role="radiogroup" aria-label="Sync frequency">
                {freqOptions.map((opt) => (
                  <S.RadioOption
                    key={opt.value}
                    $selected={frequency === opt.value}
                    onClick={() => setFrequency(opt.value)}
                  >
                    <S.RadioDot $selected={frequency === opt.value} />
                    {opt.label}
                  </S.RadioOption>
                ))}
              </S.RadioGroup>
            </div>

            {/* Save */}
            <S.BtnRow style={{ paddingTop: 0 }}>
              <S.FillBtn type="button" style={{ flex: 1 }}>
                Save Filter Settings
              </S.FillBtn>
            </S.BtnRow>
          </S.FilterFieldGroup>
        </S.FilterPanel>

        {/* ── Connected accounts table ── */}
        <S.AccountsSection>
          <S.AccountsTableTop>
            <S.AccountsTableTitle>Connected Accounts</S.AccountsTableTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <S.StreamingBadge style={{ color: '#4b8eff' }}>
                <S.StreamingDot style={{ background: '#4b8eff' }} aria-hidden />
                {accounts.length} Active
              </S.StreamingBadge>
            </div>
          </S.AccountsTableTop>

          <div style={{ overflowX: 'auto' }}>
            <S.AccountsTable>
              <thead>
                <tr>
                  <S.AccountsTH style={{ width: '2.5rem', paddingRight: 0 }} />
                  <S.AccountsTH>Account</S.AccountsTH>
                  <S.AccountsTH>Provider</S.AccountsTH>
                  <S.AccountsTH>Watch Folder</S.AccountsTH>
                  <S.AccountsTH>Last Sync</S.AccountsTH>
                  <S.AccountsTH>Status</S.AccountsTH>
                  <S.AccountsTH style={{ textAlign: 'right' }}>Actions</S.AccountsTH>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc, i) => {
                  const pcfg = PROVIDER_CONFIG[acc.provider]
                  return (
                    <S.AccountsTR key={`${acc.email}-${i}`}>
                      <S.AccountLogoCell>
                        <S.AccountLogo $bg={pcfg.bg}>{pcfg.logo}</S.AccountLogo>
                      </S.AccountLogoCell>
                      <S.AccountEmailCell>{acc.email}</S.AccountEmailCell>
                      <S.AccountsTD style={{ color: '#98a6bf' }}>{pcfg.label}</S.AccountsTD>
                      <S.AccountsTD
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: '#98a6bf',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {acc.folder}
                      </S.AccountsTD>
                      <S.AccountsTD
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.8125rem',
                          color: '#64748b',
                        }}
                      >
                        {acc.lastSync}
                      </S.AccountsTD>
                      <S.AccountsTD>
                        <S.AccountStatusChip $ok={acc.healthy}>
                          {acc.healthy ? 'Active' : 'Error'}
                        </S.AccountStatusChip>
                      </S.AccountsTD>
                      <S.AccountsTD style={{ textAlign: 'right' }}>
                        <S.AccountRevokeBtn
                          type="button"
                          onClick={() => handleRevoke(i)}
                          aria-label={`Revoke access for ${acc.email}`}
                        >
                          Revoke
                        </S.AccountRevokeBtn>
                      </S.AccountsTD>
                    </S.AccountsTR>
                  )
                })}
              </tbody>
            </S.AccountsTable>
          </div>
        </S.AccountsSection>

      </S.EmailGrid>

      <div
        aria-hidden
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '16rem',
          pointerEvents: 'none',
          zIndex: -1,
          background: 'linear-gradient(to top, rgba(75,142,255,0.06), transparent)',
        }}
      />
    </S.PageShell>
  )
}
