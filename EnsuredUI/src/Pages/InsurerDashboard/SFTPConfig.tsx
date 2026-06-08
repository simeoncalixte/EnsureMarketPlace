import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import styled from 'styled-components'
import { getChannel } from '../../api/ingestionChannels'
import * as S from './InsurerDashboard.styles'
import { colors } from '../../xds/colors'
import {
  Badge,
  Breadcrumb,
  Button,
  FormField,
  MaskedSecretInput,
  SegmentedSwitch,
  Textarea,
  ToggleSwitch,
  DataTable,
} from '../../xds'

type AuthMethod = 'password' | 'key'
type SessionStatus = 'connected' | 'idle' | 'error'

interface SFTPSession {
  host: string
  user: string
  port: number
  path: string
  lastActivity: string
  status: SessionStatus
}

const SEED_SESSIONS: SFTPSession[] = [
  { host: '10.0.12.44',      user: 'ingest_svc',  port: 22,   path: '/data/exposure/raw',    lastActivity: '2m ago',  status: 'connected' },
  { host: 'sftp.broker.io',  user: 'sure_feed',   port: 22,   path: '/outbound/submissions', lastActivity: '18m ago', status: 'connected' },
  { host: '172.16.8.201',    user: 'backup_rdr',  port: 2222, path: '/archive/2026',         lastActivity: '2h ago',  status: 'idle'      },
  { host: 'legacy.cedant.co',user: 'pipeline',    port: 22,   path: '/drop',                 lastActivity: '8h ago',  status: 'error'     },
]

const STAT_ROWS = [
  { label: 'Active sessions',    value: '2' },
  { label: 'Files ingested today', value: '1,204' },
  { label: 'Bytes transferred',  value: '4.1 GB' },
  { label: 'Avg transfer rate',  value: '12.4 MB/s' },
  { label: 'Failed transfers',   value: '3' },
  { label: 'Host key algorithm', value: 'ED25519' },
]

const STATUS_VARIANT: Record<SessionStatus, 'success' | 'neutral' | 'danger'> = {
  connected: 'success',
  idle: 'neutral',
  error: 'danger',
}

const PanelTitleIcon = styled.span`
  font-size: 1.125rem;
  color: ${colors.primarySoft};
`

const MonoCell = styled.span`
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.primarySoft};
`

const MutedMonoCell = styled.span`
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.neutral[500]};
`

const PlainMonoCell = styled.span`
  font-family: 'JetBrains Mono', monospace;
`

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.375rem;
`

const TableScroll = styled.div`
  overflow-x: auto;
`

const BtnIcon = styled.span`
  font-size: 0.875rem;
`

export default function SFTPConfig(): React.JSX.Element {
  const { channelId } = useParams() as { channelId?: string }
  const [channelLabel, setChannelLabel] = useState<string | null>(null)
  const [authMethod, setAuthMethod] = useState<AuthMethod>('key')
  const [host, setHost]             = useState('')
  const [port, setPort]             = useState('22')
  const [username, setUsername]     = useState('')
  const [password, setPassword]     = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [strictHost, setStrictHost] = useState(true)
  const [compress, setCompress]     = useState(false)
  const [sessions, setSessions]     = useState<SFTPSession[]>(SEED_SESSIONS)
  const [testing, setTesting]       = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle')

  function handleTest() {
    setTesting(true)
    setTestResult('idle')
    setTimeout(() => { setTesting(false); setTestResult('ok') }, 1500)
  }

  useEffect(() => {
    if (!channelId) return
    getChannel(channelId)
      .then((data: any) => {
        if (data?.label) setChannelLabel(data.label)
        if (typeof data?.meta === 'string') {
          const parts = data.meta.split(':')
          setHost(parts[0] ?? '')
          setPort(parts[1] ?? '22')
        }
        if (data?.config) {
          if (data.config.username) setUsername(String(data.config.username))
        }
      })
      .catch(() => {})
  }, [channelId])

  function removeSession(idx: number) {
    setSessions((prev) => prev.filter((_, i) => i !== idx))
  }

  const connectedCount = sessions.filter((s) => s.status === 'connected').length

  return (
    <S.PageShell>
      <Breadcrumb
        items={[
          { label: 'Ingestion' },
          { label: 'Channels' },
          { label: channelLabel ?? 'SFTP' },
        ]}
      />

      {/* Header */}
      <S.EmailPageHeader>
        <S.EmailPageTitle>SFTP Ingestion</S.EmailPageTitle>
        <S.EmailPageDesc>
          Connect to remote SFTP servers to continuously poll and ingest structured data files.
          Authenticate with a password or an SSH private key — Sovereign Cap stores credentials
          encrypted at rest and never logs plaintext secrets.
        </S.EmailPageDesc>
      </S.EmailPageHeader>

      <S.SFTPGrid>

        {/* ── Connection card (spans 2 rows) ── */}
        <S.SFTPConnCard>
          <S.SFTPConnCardDecor aria-hidden>terminal</S.SFTPConnCardDecor>

          <S.SFTPConnTitle>
            <PanelTitleIcon className="material-symbols-outlined">lan</PanelTitleIcon>
            Connection Settings
          </S.SFTPConnTitle>

          <S.FieldGroup>
            {/* Host + Port side-by-side */}
            <S.TwoFields>
              <FormField
                id="sftp-host"
                label="Host / IP"
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="sftp.example.com"
              />
              <FormField
                id="sftp-port"
                label="Port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="22"
              />
            </S.TwoFields>

            <FormField
              id="sftp-user"
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ingest_svc"
            />

            {/* Auth method tabs */}
            <div>
              <S.FieldLabel as="span">Authentication Method</S.FieldLabel>
              <SegmentedSwitch
                aria-label="Authentication Method"
                options={[
                  { label: 'SSH Private Key', value: 'key' },
                  { label: 'Password', value: 'password' },
                ]}
                value={authMethod}
                onChange={(v: string) => setAuthMethod(v as AuthMethod)}
              />
            </div>

            {authMethod === 'password' ? (
              <div>
                <S.FieldLabel htmlFor="sftp-pw">Password</S.FieldLabel>
                <MaskedSecretInput
                  id="sftp-pw"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••••••"
                />
              </div>
            ) : (
              <>
                <div>
                  <S.FieldLabel htmlFor="sftp-key">Private Key (PEM)</S.FieldLabel>
                  <Textarea
                    id="sftp-key"
                    rows={6}
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder={'-----BEGIN OPENSSH PRIVATE KEY-----\n…\n-----END OPENSSH PRIVATE KEY-----'}
                  />
                </div>
                <div>
                  <S.FieldLabel htmlFor="sftp-pp">Key Passphrase (optional)</S.FieldLabel>
                  <MaskedSecretInput
                    id="sftp-pp"
                    value={passphrase}
                    onChange={setPassphrase}
                    placeholder="••••••••••••"
                  />
                </div>
              </>
            )}

            {/* Options toggles */}
            <S.TogglesRow>
              <S.ToggleText>
                <S.ToggleLabel as="div">Strict Host Key Checking</S.ToggleLabel>
              </S.ToggleText>
              <ToggleSwitch checked={strictHost} onChange={() => setStrictHost((v) => !v)} />
            </S.TogglesRow>
            <S.SFTPKnownHostsRow>
              <S.SFTPKnownHostsLabel>Stored fingerprint</S.SFTPKnownHostsLabel>
              <S.SFTPKnownHostsFp>
                {strictHost ? 'SHA256:xK9mL2…4TrPqZ' : '—'}
              </S.SFTPKnownHostsFp>
            </S.SFTPKnownHostsRow>

            <S.TogglesRow>
              <S.ToggleText>
                <S.ToggleLabel as="div">Enable SSH Compression</S.ToggleLabel>
              </S.ToggleText>
              <ToggleSwitch checked={compress} onChange={() => setCompress((v) => !v)} />
            </S.TogglesRow>

            <S.BtnRow>
              <Button variant="ghost" type="button" onClick={handleTest} disabled={testing}>
                <BtnIcon className="material-symbols-outlined">sync</BtnIcon>
                {testing ? 'Testing…' : testResult === 'ok' ? 'Connected ✓' : testResult === 'fail' ? 'Failed ✗' : 'Test Connection'}
              </Button>
              <Button variant="primary" type="button">Save Credentials</Button>
            </S.BtnRow>
          </S.FieldGroup>
        </S.SFTPConnCard>

        {/* ── Stats card ── */}
        <S.SFTPStatsCard>
          <S.SFTPStatsTitle>Transfer Stats</S.SFTPStatsTitle>
          {STAT_ROWS.map((r) => (
            <S.SFTPStatRow key={r.label}>
              <S.SFTPStatLabel>{r.label}</S.SFTPStatLabel>
              <S.SFTPStatValue>{r.value}</S.SFTPStatValue>
            </S.SFTPStatRow>
          ))}
        </S.SFTPStatsCard>

        {/* ── Active sessions table ── */}
        <S.SFTPSessionsCard>
          <S.SFTPSessionsTop>
            <S.SFTPSessionsTitle>Configured Servers</S.SFTPSessionsTitle>
            <Badge variant="success" dot>{connectedCount} Active</Badge>
          </S.SFTPSessionsTop>

          <TableScroll>
            <DataTable<SFTPSession & { __idx: number }>
              columns={[
                { key: 'host', header: 'Host', render: (s) => <S.SFTPHostCell as="span">{s.host}</S.SFTPHostCell> },
                { key: 'user', header: 'User', render: (s) => <MonoCell>{s.user}</MonoCell> },
                { key: 'port', header: 'Port', render: (s) => <PlainMonoCell>{s.port}</PlainMonoCell> },
                { key: 'path', header: 'Path', render: (s) => <MutedMonoCell>{s.path}</MutedMonoCell> },
                { key: 'lastActivity', header: 'Last Activity', render: (s) => s.lastActivity },
                {
                  key: 'status',
                  header: 'Status',
                  render: (s) => <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>,
                },
              ]}
              data={sessions.map((s, i) => ({ ...s, __idx: i }))}
              rowActions={(s) => (
                <ActionRow>
                  <S.SFTPActionBtn aria-label={`Sync ${s.host}`}>sync</S.SFTPActionBtn>
                  <Button variant="outline" tone="danger" size="sm" type="button" onClick={() => removeSession(s.__idx)} aria-label={`Remove ${s.host}`}>
                    Remove
                  </Button>
                </ActionRow>
              )}
            />
          </TableScroll>
        </S.SFTPSessionsCard>

      </S.SFTPGrid>
    </S.PageShell>
  )
}
