import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { getApiBase } from '../../lib/api'
import * as S from './InsurerDashboard.styles'

type CloudProvider = 'aws' | 'gcs' | 'azure'
type BucketStatus = 'syncing' | 'idle' | 'error'

interface BucketRow {
  provider: CloudProvider
  bucket: string
  region: string
  files: string
  lastSync: string
  status: BucketStatus
}

const SEED_BUCKETS: BucketRow[] = [
  { provider: 'aws',   bucket: 'sovereign-raw-exposure',    region: 'us-east-1',      files: '12,402', lastSync: '1m ago',  status: 'syncing' },
  { provider: 'gcs',   bucket: 'risk-ingest-prod',          region: 'us-central1',    files: '4,891',  lastSync: '8m ago',  status: 'syncing' },
  { provider: 'azure', bucket: 'exposure-data-blob',        region: 'eastus',         files: '923',    lastSync: '42m ago', status: 'idle'    },
  { provider: 'aws',   bucket: 'legacy-submissions-backup', region: 'us-west-2',      files: '—',      lastSync: '3h ago',  status: 'error'   },
]

const PROVIDER_CFG = {
  aws: {
    label: 'Amazon S3',
    sublabel: 'AWS / S3-compatible',
    logo: '🟡',
    bg: 'linear-gradient(135deg,#ff9900,#e05a00)',
    accent: '#ff9900',
    credFields: [
      { id: 'accessKey',  label: 'Access Key ID',        placeholder: 'AKIA…',             secret: false },
      { id: 'secretKey',  label: 'Secret Access Key',    placeholder: '••••••••••••••••',  secret: true  },
      { id: 'region',     label: 'Default Region',       placeholder: 'us-east-1',         secret: false },
      { id: 'endpoint',   label: 'Custom Endpoint (opt)',placeholder: 'https://…',         secret: false },
    ],
  },
  gcs: {
    label: 'Google Cloud Storage',
    sublabel: 'GCP / GCS',
    logo: '🔵',
    bg: 'linear-gradient(135deg,#4285f4,#34a853)',
    accent: '#4285f4',
    credFields: [
      { id: 'projectId',    label: 'Project ID',            placeholder: 'my-gcp-project',   secret: false },
      { id: 'serviceAcct',  label: 'Service Account JSON',  placeholder: '{"type":"service_account",…}', secret: true },
    ],
  },
  azure: {
    label: 'Azure Blob Storage',
    sublabel: 'Microsoft Azure',
    logo: '🔷',
    bg: 'linear-gradient(135deg,#00a4ef,#0078d4)',
    accent: '#00a4ef',
    credFields: [
      { id: 'accountName', label: 'Storage Account Name', placeholder: 'mystorage',         secret: false },
      { id: 'accountKey',  label: 'Account Key',          placeholder: '••••••••••••••••',  secret: true  },
      { id: 'container',   label: 'Default Container',    placeholder: 'exposure-data',     secret: false },
    ],
  },
} as const

const OPTIONS = [
  { icon: 'verified',        color: '#4edea3', name: 'Checksum Verification',   desc: 'Validate MD5/SHA-256 of every downloaded object before parsing.' },
  { icon: 'compress',        color: '#4b8eff', name: 'Auto-decompress Archives', desc: 'Unzip .gz and .zip files in-flight during ingestion.' },
  { icon: 'folder_delete',   color: '#ffb3ad', name: 'Archive after Ingest',     desc: 'Move processed objects to an /archived/ prefix automatically.' },
  { icon: 'notifications',   color: '#fbbc05', name: 'Error Alerts',             desc: 'Emit a pipeline alert when an object fails schema validation.' },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <S.ToggleLabel onClick={onChange}>
      <S.ToggleTrack $checked={checked}><S.ToggleKnob $checked={checked} /></S.ToggleTrack>
    </S.ToggleLabel>
  )
}

export default function CloudStorageConfig(): JSX.Element {
  const { channelId } = useParams() as { channelId?: string }
  const [channelLabel, setChannelLabel] = useState<string | null>(null)
  const [provider, setProvider]   = useState<CloudProvider>('aws')
  const [creds, setCreds]         = useState<Record<string, string>>({})
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  const [watchPaths, setWatchPaths] = useState<string[]>(['/raw-exposure-data', '/submissions/inbound'])
  const [newPath, setNewPath]     = useState('')
  const [options, setOptions]     = useState([true, true, false, true])
  const [buckets, setBuckets]     = useState<BucketRow[]>(SEED_BUCKETS)
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle')

  const cfg = PROVIDER_CFG[provider]

  function handleTest() {
    setTesting(true)
    setTestResult('idle')
    setTimeout(() => { setTesting(false); setTestResult('ok') }, 1600)
  }

  function handleSave() { /* TODO: wire to API */ }

  function addPath() {
    const p = newPath.trim()
    if (p && !watchPaths.includes(p)) setWatchPaths((prev) => [...prev, p])
    setNewPath('')
  }

  function removePath(idx: number) {
    setWatchPaths((prev) => prev.filter((_, i) => i !== idx))
  }

  function removeBucket(idx: number) {
    setBuckets((prev) => prev.filter((_, i) => i !== idx))
  }

  useEffect(() => {
    if (!channelId) return
    const base = getApiBase()
    fetch(`${base}/api/ingestion-channels/${channelId}`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error('Not found'); return r.json() })
      .then((data) => {
        if (data?.label) setChannelLabel(data.label)
        if (typeof data?.meta === 'string') setWatchPaths([String(data.meta)])
        if (data?.config?.watchPaths && Array.isArray(data.config.watchPaths)) setWatchPaths(data.config.watchPaths)
      })
      .catch(() => {})
  }, [channelId])

  return (
    <S.PageShell>
      {/* Breadcrumb */}
      <S.Breadcrumb aria-label="breadcrumb">
        <S.BreadcrumbItem>Ingestion</S.BreadcrumbItem>
        <S.BreadcrumbSep aria-hidden>›</S.BreadcrumbSep>
        <S.BreadcrumbItem>Channels</S.BreadcrumbItem>
        <S.BreadcrumbSep aria-hidden>›</S.BreadcrumbSep>
        <S.BreadcrumbActive>{channelLabel ?? 'Cloud Storage'}</S.BreadcrumbActive>
      </S.Breadcrumb>

      {/* Header */}
      <S.EmailPageHeader>
        <S.EmailPageTitle>Cloud Storage Ingestion</S.EmailPageTitle>
        <S.EmailPageDesc>
          Connect an S3, GCS, or Azure Blob bucket as a live ingestion source. Sovereign Cap
          will watch designated object paths and route new files directly into the processing
          pipeline using least-privilege credentials.
        </S.EmailPageDesc>
      </S.EmailPageHeader>

      <S.CloudGrid>

        {/* ── Provider selection ── */}
        <S.CloudProviderRow>
          {(['aws', 'gcs', 'azure'] as CloudProvider[]).map((p) => {
            const c = PROVIDER_CFG[p]
            return (
              <S.ProviderCard
                key={p}
                $selected={provider === p}
                $accent={c.accent}
                onClick={() => { setProvider(p); setCreds({}); setTestResult('idle') }}
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
        </S.CloudProviderRow>

        {/* ── Credentials card ── */}
        <S.CloudConnCard>
          <S.CloudConnCardDecor aria-hidden>cloud</S.CloudConnCardDecor>

          <S.CloudConnTitle>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: '#adc6ff' }}>
              vpn_key
            </span>
            {cfg.label} — Credentials
          </S.CloudConnTitle>

          <S.FieldGroup>
            {cfg.credFields.map((f) => (
              <div key={f.id}>
                <S.FieldLabel htmlFor={`cloud-${f.id}`}>{f.label}</S.FieldLabel>
                <S.MaskedInput>
                  <S.Input
                    id={`cloud-${f.id}`}
                    type={f.secret && !showSecret[f.id] ? 'password' : 'text'}
                    value={creds[f.id] ?? ''}
                    onChange={(e) => setCreds((prev) => ({ ...prev, [f.id]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', paddingRight: f.secret ? '2rem' : undefined }}
                  />
                  {f.secret && (
                    <S.EyeBtn
                      type="button"
                      aria-label={showSecret[f.id] ? `Hide ${f.label}` : `Show ${f.label}`}
                      onClick={() => setShowSecret((prev) => ({ ...prev, [f.id]: !prev[f.id] }))}
                    >
                      {showSecret[f.id] ? 'visibility_off' : 'visibility'}
                    </S.EyeBtn>
                  )}
                </S.MaskedInput>
              </div>
            ))}

            {/* Watch paths */}
            <div>
              <S.FieldLabel>Watch Paths</S.FieldLabel>
              <S.WatchPathList>
                {watchPaths.map((path, i) => (
                  <S.WatchPathRow key={path}>
                    <S.WatchPathChip>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        folder
                      </span>
                      {path}
                    </S.WatchPathChip>
                    <S.WatchPathRemove
                      type="button"
                      aria-label={`Remove ${path}`}
                      onClick={() => removePath(i)}
                    >
                      close
                    </S.WatchPathRemove>
                  </S.WatchPathRow>
                ))}
                <S.WatchPathRow>
                  <S.Input
                    type="text"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPath() } }}
                    placeholder="/new/path/to/watch"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8125rem' }}
                  />
                  <S.AddPathBtn type="button" onClick={addPath}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>add</span>
                    Add
                  </S.AddPathBtn>
                </S.WatchPathRow>
              </S.WatchPathList>
            </div>

            <S.BtnRow>
              <S.GhostBtn type="button" onClick={handleTest} disabled={testing}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>sync</span>
                {testing ? 'Testing…' : testResult === 'ok' ? 'Connected ✓' : testResult === 'fail' ? 'Failed ✗' : 'Test Connection'}
              </S.GhostBtn>
              <S.FillBtn type="button" onClick={handleSave}>Save Credentials</S.FillBtn>
            </S.BtnRow>
          </S.FieldGroup>
        </S.CloudConnCard>

        {/* ── Options panel ── */}
        <S.CloudOptionsPanel>
          <S.CloudOptionTitle>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: '#adc6ff' }}>
              tune
            </span>
            Ingest Options
          </S.CloudOptionTitle>

          {OPTIONS.map((opt, i) => (
            <S.OptionRow key={opt.name}>
              <S.ScopeIcon $color={opt.color}>{opt.icon}</S.ScopeIcon>
              <S.OptionText style={{ flex: 1 }}>
                <S.OptionName>{opt.name}</S.OptionName>
                <S.OptionDesc>{opt.desc}</S.OptionDesc>
              </S.OptionText>
              <Toggle
                checked={options[i]}
                onChange={() => setOptions((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
              />
            </S.OptionRow>
          ))}
        </S.CloudOptionsPanel>

        {/* ── Connected buckets table ── */}
        <S.BucketsSection>
          <S.BucketsTableTop>
            <S.BucketsTableTitle>Connected Buckets</S.BucketsTableTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <S.StreamingBadge>
                <S.StreamingDot aria-hidden />
                {buckets.filter((b) => b.status === 'syncing').length} Syncing
              </S.StreamingBadge>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.25rem', color: '#64748b', cursor: 'pointer' }}
              >
                search
              </span>
            </div>
          </S.BucketsTableTop>

          <div style={{ overflowX: 'auto' }}>
            <S.BucketsTable>
              <thead>
                <tr>
                  <S.BucketsTH style={{ width: '2.5rem', paddingRight: 0 }} />
                  <S.BucketsTH>Bucket / Container</S.BucketsTH>
                  <S.BucketsTH>Provider</S.BucketsTH>
                  <S.BucketsTH>Region</S.BucketsTH>
                  <S.BucketsTH>Files Ingested</S.BucketsTH>
                  <S.BucketsTH>Last Sync</S.BucketsTH>
                  <S.BucketsTH>Status</S.BucketsTH>
                  <S.BucketsTH style={{ textAlign: 'right' }}>Actions</S.BucketsTH>
                </tr>
              </thead>
              <tbody>
                {buckets.map((row, i) => {
                  const pc = PROVIDER_CFG[row.provider]
                  return (
                    <S.BucketsTR key={`${row.bucket}-${i}`}>
                      <S.BucketsTD style={{ paddingRight: 0 }}>
                        <S.AccountLogo $bg={pc.bg}>{pc.logo}</S.AccountLogo>
                      </S.BucketsTD>
                      <S.BucketNameCell>{row.bucket}</S.BucketNameCell>
                      <S.BucketsTD style={{ color: '#98a6bf' }}>{pc.label}</S.BucketsTD>
                      <S.BucketMonoCell>{row.region}</S.BucketMonoCell>
                      <S.BucketMonoCell>{row.files}</S.BucketMonoCell>
                      <S.BucketMonoCell>{row.lastSync}</S.BucketMonoCell>
                      <S.BucketsTD>
                        <S.BucketStatusChip $status={row.status}>{row.status}</S.BucketStatusChip>
                      </S.BucketsTD>
                      <S.BucketsTD style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <S.BucketActionBtn aria-label={`Sync ${row.bucket}`}>sync</S.BucketActionBtn>
                          <S.AccountRevokeBtn
                            type="button"
                            onClick={() => removeBucket(i)}
                            aria-label={`Disconnect ${row.bucket}`}
                          >
                            Disconnect
                          </S.AccountRevokeBtn>
                        </div>
                      </S.BucketsTD>
                    </S.BucketsTR>
                  )
                })}
              </tbody>
            </S.BucketsTable>
          </div>
        </S.BucketsSection>

      </S.CloudGrid>

      <div
        aria-hidden
        style={{
          position: 'fixed', bottom: 0, left: 0, width: '100%', height: '16rem',
          pointerEvents: 'none', zIndex: -1,
          background: 'linear-gradient(to top, rgba(75,142,255,0.06), transparent)',
        }}
      />
    </S.PageShell>
  )
}
