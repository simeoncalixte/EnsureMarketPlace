import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { getApiBase } from '../../lib/api'
import * as S from './InsurerDashboard.styles'

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

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <S.ToggleLabel onClick={onChange}>
      <S.ToggleTrack $checked={checked}><S.ToggleKnob $checked={checked} /></S.ToggleTrack>
    </S.ToggleLabel>
  )
}

export default function SFTPConfig(): JSX.Element {
  const { channelId } = useParams() as { channelId?: string }
  const [channelLabel, setChannelLabel] = useState<string | null>(null)
  const [authMethod, setAuthMethod] = useState<AuthMethod>('key')
  const [host, setHost]             = useState('')
  const [port, setPort]             = useState('22')
  const [username, setUsername]     = useState('')
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [privateKey, setPrivateKey] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [showPp, setShowPp]         = useState(false)
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
    const base = getApiBase()
    fetch(`${base}/api/ingestion-channels/${channelId}`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error('Not found'); return r.json() })
      .then((data) => {
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
      {/* Breadcrumb */}
      <S.Breadcrumb aria-label="breadcrumb">
        <S.BreadcrumbItem>Ingestion</S.BreadcrumbItem>
        <S.BreadcrumbSep aria-hidden>›</S.BreadcrumbSep>
        <S.BreadcrumbItem>Channels</S.BreadcrumbItem>
        <S.BreadcrumbSep aria-hidden>›</S.BreadcrumbSep>
        <S.BreadcrumbActive>{channelLabel ?? 'SFTP'}</S.BreadcrumbActive>
      </S.Breadcrumb>

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
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: '#adc6ff' }}>
              lan
            </span>
            Connection Settings
          </S.SFTPConnTitle>

          <S.FieldGroup>
            {/* Host + Port side-by-side */}
            <S.TwoFields>
              <div>
                <S.FieldLabel htmlFor="sftp-host">Host / IP</S.FieldLabel>
                <S.Input
                  id="sftp-host"
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="sftp.example.com"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <S.FieldLabel htmlFor="sftp-port">Port</S.FieldLabel>
                <S.Input
                  id="sftp-port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="22"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
                />
              </div>
            </S.TwoFields>

            <div>
              <S.FieldLabel htmlFor="sftp-user">Username</S.FieldLabel>
              <S.Input
                id="sftp-user"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ingest_svc"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
              />
            </div>

            {/* Auth method tabs */}
            <div>
              <S.FieldLabel as="span">Authentication Method</S.FieldLabel>
              <S.SFTPAuthRow>
                <S.SFTPAuthTab $active={authMethod === 'key'} type="button" onClick={() => setAuthMethod('key')}>
                  SSH Private Key
                </S.SFTPAuthTab>
                <S.SFTPAuthTab $active={authMethod === 'password'} type="button" onClick={() => setAuthMethod('password')}>
                  Password
                </S.SFTPAuthTab>
              </S.SFTPAuthRow>
            </div>

            {authMethod === 'password' ? (
              <div>
                <S.FieldLabel htmlFor="sftp-pw">Password</S.FieldLabel>
                <S.MaskedInput>
                  <S.Input
                    id="sftp-pw"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
                  />
                  <S.EyeBtn type="button" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw((v) => !v)}>
                    {showPw ? 'visibility_off' : 'visibility'}
                  </S.EyeBtn>
                </S.MaskedInput>
              </div>
            ) : (
              <>
                <div>
                  <S.FieldLabel htmlFor="sftp-key">Private Key (PEM)</S.FieldLabel>
                  <S.SFTPKeyArea
                    id="sftp-key"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;…&#10;-----END OPENSSH PRIVATE KEY-----"
                  />
                </div>
                <div>
                  <S.FieldLabel htmlFor="sftp-pp">Key Passphrase (optional)</S.FieldLabel>
                  <S.MaskedInput>
                    <S.Input
                      id="sftp-pp"
                      type={showPp ? 'text' : 'password'}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="••••••••••••"
                      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
                    />
                    <S.EyeBtn type="button" aria-label={showPp ? 'Hide passphrase' : 'Show passphrase'} onClick={() => setShowPp((v) => !v)}>
                      {showPp ? 'visibility_off' : 'visibility'}
                    </S.EyeBtn>
                  </S.MaskedInput>
                </div>
              </>
            )}

            {/* Options toggles */}
            <S.TogglesRow>
              <S.ToggleText>
                <S.ToggleLabel as="div">Strict Host Key Checking</S.ToggleLabel>
              </S.ToggleText>
              <Toggle checked={strictHost} onChange={() => setStrictHost((v) => !v)} />
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
              <Toggle checked={compress} onChange={() => setCompress((v) => !v)} />
            </S.TogglesRow>

            <S.BtnRow>
              <S.GhostBtn type="button" onClick={handleTest} disabled={testing}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>sync</span>
                {testing ? 'Testing…' : testResult === 'ok' ? 'Connected ✓' : testResult === 'fail' ? 'Failed ✗' : 'Test Connection'}
              </S.GhostBtn>
              <S.FillBtn type="button">Save Credentials</S.FillBtn>
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
            <S.StreamingBadge>
              <S.StreamingDot aria-hidden />
              {connectedCount} Active
            </S.StreamingBadge>
          </S.SFTPSessionsTop>

          <div style={{ overflowX: 'auto' }}>
            <S.SFTPTable>
              <thead>
                <tr>
                  <S.SFTPTh>Host</S.SFTPTh>
                  <S.SFTPTh>User</S.SFTPTh>
                  <S.SFTPTh>Port</S.SFTPTh>
                  <S.SFTPTh>Path</S.SFTPTh>
                  <S.SFTPTh>Last Activity</S.SFTPTh>
                  <S.SFTPTh>Status</S.SFTPTh>
                  <S.SFTPTh style={{ textAlign: 'right' }}>Actions</S.SFTPTh>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <S.SFTPTr key={`${s.host}-${i}`}>
                    <S.SFTPHostCell>{s.host}</S.SFTPHostCell>
                    <S.SFTPTd style={{ fontFamily: "'JetBrains Mono', monospace", color: '#c8d8f0' }}>{s.user}</S.SFTPTd>
                    <S.SFTPTd style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.port}</S.SFTPTd>
                    <S.SFTPTd style={{ fontFamily: "'JetBrains Mono', monospace", color: '#64748b' }}>{s.path}</S.SFTPTd>
                    <S.SFTPTd>{s.lastActivity}</S.SFTPTd>
                    <S.SFTPTd>
                      <S.SFTPStatusChip $status={s.status}>{s.status}</S.SFTPStatusChip>
                    </S.SFTPTd>
                    <S.SFTPTd style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                        <S.SFTPActionBtn aria-label={`Sync ${s.host}`}>sync</S.SFTPActionBtn>
                        <S.AccountRevokeBtn type="button" onClick={() => removeSession(i)} aria-label={`Remove ${s.host}`}>
                          Remove
                        </S.AccountRevokeBtn>
                      </div>
                    </S.SFTPTd>
                  </S.SFTPTr>
                ))}
              </tbody>
            </S.SFTPTable>
          </div>
        </S.SFTPSessionsCard>

      </S.SFTPGrid>
    </S.PageShell>
  )
}
