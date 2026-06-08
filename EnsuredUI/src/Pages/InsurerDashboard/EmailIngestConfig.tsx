import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import styled from 'styled-components'
import { getChannel } from '../../api/ingestionChannels'
import * as S from './InsurerDashboard.styles'
import { colors, withAlpha } from '../../xds/colors'
import { Badge, Breadcrumb, Button, DataTable, FormField, SelectionCard, ToggleSwitch } from '../../xds'

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
    color: colors.vendor.googleBlue,
    name: 'Read Mail (readonly)',
    desc: 'Allows the pipeline to read incoming messages and extract submission attachments.',
  },
  {
    icon: 'label',
    color: colors.vendor.googleGreen,
    name: 'Manage Labels',
    desc: 'Apply processing labels (e.g. "Ingested", "Failed") after a message is consumed.',
  },
  {
    icon: 'person',
    color: colors.vendor.googleYellow,
    name: 'Basic Profile',
    desc: 'Read the authenticated account email address for audit logging.',
  },
]

const SCOPES_MICROSOFT = [
  {
    icon: 'mail',
    color: colors.vendor.microsoftBlue,
    name: 'Mail.Read',
    desc: 'Read messages from the watched mailbox folder.',
  },
  {
    icon: 'category',
    color: colors.vendor.microsoftGreen,
    name: 'MailboxSettings.ReadWrite',
    desc: 'Configure auto-reply rules and folder routing for processed items.',
  },
  {
    icon: 'person',
    color: colors.vendor.microsoftRed,
    name: 'User.Read',
    desc: 'Read the signed-in account profile for audit trail enrichment.',
  },
]

const PROVIDER_CONFIG = {
  google: {
    label: 'Google Workspace',
    sublabel: 'Gmail / Google Workspace SSO',
    logo: '✉️',
    bg: `linear-gradient(135deg,${colors.vendor.googleBlue},${colors.vendor.googleGreen})`,
    accent: colors.vendor.googleBlue,
    scopes: SCOPES_GOOGLE,
  },
  microsoft: {
    label: 'Microsoft 365',
    sublabel: 'Outlook / Exchange SSO',
    logo: '📧',
    bg: `linear-gradient(135deg,${colors.vendor.microsoftBlue},${colors.vendor.microsoftGreen})`,
    accent: colors.vendor.microsoftBlue,
    scopes: SCOPES_MICROSOFT,
  },
} as const

const PanelTitleIcon = styled.span`
  font-size: 1.125rem;
  color: ${colors.primarySoft};
`

const SecurityNoteIcon = styled.span`
  font-size: 0.875rem;
  flex-shrink: 0;
  margin-top: 1px;
`

const MonoCell = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: ${colors.onSurfaceVariant};
`

const MutedMonoCell = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: ${colors.neutral[500]};
`

const AccountCellWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
`

const TableScroll = styled.div`
  overflow-x: auto;
`

const ConnectBtnIcon = styled.span`
  font-size: 1rem;
`

const SaveBtnRow = styled(S.BtnRow)`
  padding-top: 0;
`

const FullWidthButton = styled(Button)`
  flex: 1;
`

const ProviderLabelCell = styled.span`
  font-family: inherit;
  font-size: 0.8125rem;
  color: ${colors.onSurfaceVariant};
`

export default function EmailIngestConfig(): React.JSX.Element {
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
    getChannel(channelId)
      .then((data: any) => {
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
      <Breadcrumb
        items={[
          { label: 'Ingestion' },
          { label: 'Channels' },
          { label: channelLabel ?? 'Email SSO' },
        ]}
      />

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
              <SelectionCard
                key={p}
                selectionId={p}
                title={c.label}
                subtitle={c.sublabel}
                icon={<span aria-hidden>{c.logo}</span>}
                accentColor={c.accent}
                active={provider === p}
                onClick={() => setProvider(p)}
              />
            )
          })}
        </S.ProviderRow>

        {/* ── OAuth connect panel ── */}
        <S.OAuthPanel>
          <S.OAuthPanelTitle>
            <PanelTitleIcon className="material-symbols-outlined">lock</PanelTitleIcon>
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
                  <ToggleSwitch
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
            <ConnectBtnIcon className="material-symbols-outlined">
              {connecting ? 'sync' : 'login'}
            </ConnectBtnIcon>
            {connecting
              ? 'Redirecting to SSO…'
              : `Connect ${cfg.label} Account`}
          </S.ConnectBtn>

          <S.SecurityNote>
            <SecurityNoteIcon className="material-symbols-outlined">shield</SecurityNoteIcon>
            Sovereign Cap uses read-only OAuth scopes. No passwords are stored. Access can be
            revoked at any time from your provider's security settings or the table below.
          </S.SecurityNote>
        </S.OAuthPanel>

        {/* ── Filter settings panel ── */}
        <S.FilterPanel>
          <S.FilterPanelTitle>
            <PanelTitleIcon className="material-symbols-outlined">filter_alt</PanelTitleIcon>
            Inbox Filter Settings
          </S.FilterPanelTitle>

          <S.FilterFieldGroup>
            {/* Folder */}
            <FormField
              id="email-folder"
              label="Watch Folder"
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="e.g. INBOX/submissions"
            />

            {/* Subject filter */}
            <FormField
              id="email-subject"
              label="Subject Filter"
              type="text"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              placeholder="e.g. SUBJ:risk-submission"
            />

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
            <SaveBtnRow>
              <FullWidthButton variant="primary" type="button">
                Save Filter Settings
              </FullWidthButton>
            </SaveBtnRow>
          </S.FilterFieldGroup>
        </S.FilterPanel>

        {/* ── Connected accounts table ── */}
        <S.AccountsSection>
          <S.AccountsTableTop>
            <S.AccountsTableTitle>Connected Accounts</S.AccountsTableTitle>
            <Badge variant="primary" dot>{accounts.length} Active</Badge>
          </S.AccountsTableTop>

          <TableScroll>
            <DataTable<ConnectedAccount & { __idx: number }>
              columns={[
                {
                  key: 'email',
                  header: 'Account',
                  render: (acc) => (
                    <AccountCellWrap>
                      <S.AccountLogo $bg={PROVIDER_CONFIG[acc.provider].bg}>
                        {PROVIDER_CONFIG[acc.provider].logo}
                      </S.AccountLogo>
                      <S.AccountEmailCell as="span">{acc.email}</S.AccountEmailCell>
                    </AccountCellWrap>
                  ),
                },
                {
                  key: 'provider',
                  header: 'Provider',
                  render: (acc) => <ProviderLabelCell>{PROVIDER_CONFIG[acc.provider].label}</ProviderLabelCell>,
                },
                {
                  key: 'folder',
                  header: 'Watch Folder',
                  render: (acc) => <MonoCell>{acc.folder}</MonoCell>,
                },
                {
                  key: 'lastSync',
                  header: 'Last Sync',
                  render: (acc) => <MutedMonoCell>{acc.lastSync}</MutedMonoCell>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (acc) => (
                    <Badge variant={acc.healthy ? 'success' : 'danger'}>
                      {acc.healthy ? 'Active' : 'Error'}
                    </Badge>
                  ),
                },
              ]}
              data={accounts.map((acc, i) => ({ ...acc, __idx: i }))}
              rowActions={(acc) => (
                <Button
                  variant="outline"
                  tone="danger"
                  size="sm"
                  type="button"
                  onClick={() => handleRevoke(acc.__idx)}
                  aria-label={`Revoke access for ${acc.email}`}
                >
                  Revoke
                </Button>
              )}
            />
          </TableScroll>
        </S.AccountsSection>

      </S.EmailGrid>

      <AmbientGlow />
    </S.PageShell>
  )
}

const GlowLayer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 16rem;
  pointer-events: none;
  z-index: -1;
  background: linear-gradient(to top, ${withAlpha(colors.primary, 0.06)}, transparent);
`

function AmbientGlow() {
  return <GlowLayer aria-hidden />
}
