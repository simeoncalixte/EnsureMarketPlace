import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import styled from 'styled-components'
import { getChannel } from '../../api/ingestionChannels'
import * as S from './InsurerDashboard.styles'
import { colors, withAlpha } from '../../xds/colors'
import {
  Badge,
  Breadcrumb,
  Button,
  DataTable,
  FormField,
  MaskedSecretInput,
  SelectionCard,
  ToggleSwitch,
} from '../../xds'

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
    bg: `linear-gradient(135deg,${colors.vendor.awsOrange},${colors.vendor.awsOrangeDeep})`,
    accent: colors.vendor.awsOrange,
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
    bg: `linear-gradient(135deg,${colors.vendor.googleBlue},${colors.vendor.googleGreen})`,
    accent: colors.vendor.googleBlue,
    credFields: [
      { id: 'projectId',    label: 'Project ID',            placeholder: 'my-gcp-project',   secret: false },
      { id: 'serviceAcct',  label: 'Service Account JSON',  placeholder: '{"type":"service_account",…}', secret: true },
    ],
  },
  azure: {
    label: 'Azure Blob Storage',
    sublabel: 'Microsoft Azure',
    logo: '🔷',
    bg: `linear-gradient(135deg,${colors.vendor.microsoftBlue},${colors.vendor.microsoftAzure})`,
    accent: colors.vendor.microsoftBlue,
    credFields: [
      { id: 'accountName', label: 'Storage Account Name', placeholder: 'mystorage',         secret: false },
      { id: 'accountKey',  label: 'Account Key',          placeholder: '••••••••••••••••',  secret: true  },
      { id: 'container',   label: 'Default Container',    placeholder: 'exposure-data',     secret: false },
    ],
  },
} as const

const OPTIONS = [
  { icon: 'verified',        color: colors.accent, name: 'Checksum Verification',   desc: 'Validate MD5/SHA-256 of every downloaded object before parsing.' },
  { icon: 'compress',        color: colors.primary, name: 'Auto-decompress Archives', desc: 'Unzip .gz and .zip files in-flight during ingestion.' },
  { icon: 'folder_delete',   color: colors.errorSoft, name: 'Archive after Ingest',     desc: 'Move processed objects to an /archived/ prefix automatically.' },
  { icon: 'notifications',   color: colors.vendor.googleYellow, name: 'Error Alerts',             desc: 'Emit a pipeline alert when an object fails schema validation.' },
]

const STATUS_VARIANT: Record<BucketStatus, 'success' | 'neutral' | 'danger'> = {
  syncing: 'success',
  idle: 'neutral',
  error: 'danger',
}

const PanelTitleIcon = styled.span`
  font-size: 1.125rem;
  color: ${colors.primarySoft};
`

const FolderIcon = styled.span`
  font-size: 0.875rem;
  color: ${colors.neutral[500]};
`

const MonoFieldWrap = styled.div`
  input {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
  }
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const SearchIcon = styled.span`
  font-size: 1.25rem;
  color: ${colors.neutral[500]};
  cursor: pointer;
`

const MutedCell = styled.span`
  color: ${colors.onSurfaceVariant};
`

const MonoCell = styled.span`
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.primarySoft};
`

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`

const BucketCellWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
`

const TableScroll = styled.div`
  overflow-x: auto;
`

const BtnIcon = styled.span`
  font-size: 0.875rem;
`

const OptionTextFill = styled(S.OptionText)`
  flex: 1;
`

const MonoPathInput = styled(S.Input)`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
`

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

export default function CloudStorageConfig(): React.JSX.Element {
  const { channelId } = useParams() as { channelId?: string }
  const [channelLabel, setChannelLabel] = useState<string | null>(null)
  const [provider, setProvider]   = useState<CloudProvider>('aws')
  const [creds, setCreds]         = useState<Record<string, string>>({})
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
    getChannel(channelId)
      .then((data: any) => {
        if (data?.label) setChannelLabel(data.label)
        if (typeof data?.meta === 'string') setWatchPaths([String(data.meta)])
        if (data?.config?.watchPaths && Array.isArray(data.config.watchPaths)) setWatchPaths(data.config.watchPaths)
      })
      .catch(() => {})
  }, [channelId])

  return (
    <S.PageShell>
      <Breadcrumb
        items={[
          { label: 'Ingestion' },
          { label: 'Channels' },
          { label: channelLabel ?? 'Cloud Storage' },
        ]}
      />

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
              <SelectionCard
                key={p}
                selectionId={p}
                title={c.label}
                subtitle={c.sublabel}
                icon={<span aria-hidden>{c.logo}</span>}
                accentColor={c.accent}
                active={provider === p}
                onClick={() => { setProvider(p); setCreds({}); setTestResult('idle') }}
              />
            )
          })}
        </S.CloudProviderRow>

        {/* ── Credentials card ── */}
        <S.CloudConnCard>
          <S.CloudConnCardDecor aria-hidden>cloud</S.CloudConnCardDecor>

          <S.CloudConnTitle>
            <PanelTitleIcon className="material-symbols-outlined">vpn_key</PanelTitleIcon>
            {cfg.label} — Credentials
          </S.CloudConnTitle>

          <S.FieldGroup>
            {cfg.credFields.map((f) => (
              <div key={f.id}>
                {f.secret ? (
                  <>
                    <S.FieldLabel htmlFor={`cloud-${f.id}`}>{f.label}</S.FieldLabel>
                    <MaskedSecretInput
                      id={`cloud-${f.id}`}
                      value={creds[f.id] ?? ''}
                      onChange={(v) => setCreds((prev) => ({ ...prev, [f.id]: v }))}
                      placeholder={f.placeholder}
                    />
                  </>
                ) : (
                  <MonoFieldWrap>
                    <FormField
                      id={`cloud-${f.id}`}
                      label={f.label}
                      type="text"
                      value={creds[f.id] ?? ''}
                      onChange={(e) => setCreds((prev) => ({ ...prev, [f.id]: e.target.value }))}
                      placeholder={f.placeholder}
                    />
                  </MonoFieldWrap>
                )}
              </div>
            ))}

            {/* Watch paths */}
            <div>
              <S.FieldLabel>Watch Paths</S.FieldLabel>
              <S.WatchPathList>
                {watchPaths.map((path, i) => (
                  <S.WatchPathRow key={path}>
                    <S.WatchPathChip>
                      <FolderIcon className="material-symbols-outlined">folder</FolderIcon>
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
                  <MonoPathInput
                    type="text"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPath() } }}
                    placeholder="/new/path/to/watch"
                  />
                  <S.AddPathBtn type="button" onClick={addPath}>
                    <BtnIcon className="material-symbols-outlined">add</BtnIcon>
                    Add
                  </S.AddPathBtn>
                </S.WatchPathRow>
              </S.WatchPathList>
            </div>

            <S.BtnRow>
              <Button variant="ghost" type="button" onClick={handleTest} disabled={testing}>
                <BtnIcon className="material-symbols-outlined">sync</BtnIcon>
                {testing ? 'Testing…' : testResult === 'ok' ? 'Connected ✓' : testResult === 'fail' ? 'Failed ✗' : 'Test Connection'}
              </Button>
              <Button variant="primary" type="button" onClick={handleSave}>Save Credentials</Button>
            </S.BtnRow>
          </S.FieldGroup>
        </S.CloudConnCard>

        {/* ── Options panel ── */}
        <S.CloudOptionsPanel>
          <S.CloudOptionTitle>
            <PanelTitleIcon className="material-symbols-outlined">tune</PanelTitleIcon>
            Ingest Options
          </S.CloudOptionTitle>

          {OPTIONS.map((opt, i) => (
            <S.OptionRow key={opt.name}>
              <S.ScopeIcon $color={opt.color}>{opt.icon}</S.ScopeIcon>
              <OptionTextFill>
                <S.OptionName>{opt.name}</S.OptionName>
                <S.OptionDesc>{opt.desc}</S.OptionDesc>
              </OptionTextFill>
              <ToggleSwitch
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
            <HeaderRight>
              <Badge variant="success" dot>
                {buckets.filter((b) => b.status === 'syncing').length} Syncing
              </Badge>
              <SearchIcon className="material-symbols-outlined">search</SearchIcon>
            </HeaderRight>
          </S.BucketsTableTop>

          <TableScroll>
            <DataTable<BucketRow & { __idx: number }>
              columns={[
                {
                  key: 'bucket',
                  header: 'Bucket / Container',
                  render: (row) => (
                    <BucketCellWrap>
                      <S.AccountLogo $bg={PROVIDER_CFG[row.provider].bg}>{PROVIDER_CFG[row.provider].logo}</S.AccountLogo>
                      <S.BucketNameCell as="span">{row.bucket}</S.BucketNameCell>
                    </BucketCellWrap>
                  ),
                },
                { key: 'provider', header: 'Provider', render: (row) => <MutedCell>{PROVIDER_CFG[row.provider].label}</MutedCell> },
                { key: 'region', header: 'Region', render: (row) => <MonoCell>{row.region}</MonoCell> },
                { key: 'files', header: 'Files Ingested', render: (row) => <MonoCell>{row.files}</MonoCell> },
                { key: 'lastSync', header: 'Last Sync', render: (row) => <MonoCell>{row.lastSync}</MonoCell> },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>,
                },
              ]}
              data={buckets.map((row, i) => ({ ...row, __idx: i }))}
              rowActions={(row) => (
                <ActionRow>
                  <S.BucketActionBtn aria-label={`Sync ${row.bucket}`}>sync</S.BucketActionBtn>
                  <Button
                    variant="outline"
                    tone="danger"
                    size="sm"
                    type="button"
                    onClick={() => removeBucket(row.__idx)}
                    aria-label={`Disconnect ${row.bucket}`}
                  >
                    Disconnect
                  </Button>
                </ActionRow>
              )}
            />
          </TableScroll>
        </S.BucketsSection>

      </S.CloudGrid>

      <GlowLayer aria-hidden />
    </S.PageShell>
  )
}
