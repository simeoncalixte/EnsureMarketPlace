import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import * as S from './InsurerDashboard.styles'
import { useIngestionChannels, type ChannelType, type Channel } from '../../lib/useIngestionChannels'

type ChannelStatus = 'active' | 'syncing' | 'idle' | 'error'

const CHANNEL_DEFS: Record<ChannelType, {
  label: string
  icon: string
  accent: string
  bg: string
  route: string
  defaultMeta: string
  description: string
}> = {
  'rabbitmq':      { label: 'RabbitMQ',      icon: '🐇',  accent: '#ff9900', bg: 'rgba(255,153,0,0.10)',     route: '/insurer/pipeline-ingestion/rabbitmq',      defaultMeta: 'amqp://localhost:5672',    description: 'AMQP message broker — durable queues & routing'  },
  'email-sso':     { label: 'Email SSO',      icon: '📧',  accent: '#4285f4', bg: 'rgba(66,133,244,0.10)',    route: '/insurer/pipeline-ingestion/email-sso',      defaultMeta: 'Google Workspace',         description: 'Ingest via OAuth-connected Google / O365 mailbox' },
  'cloud-storage': { label: 'Cloud Storage',  icon: '☁️',  accent: '#4b8eff', bg: 'rgba(75,142,255,0.10)',    route: '/insurer/pipeline-ingestion/cloud-storage',  defaultMeta: '/raw-exposure-data',       description: 'S3 · GCS · Azure Blob — watch-path polling'      },
  'sftp':          { label: 'SFTP',           icon: '🖥️',  accent: '#94a3b8', bg: 'rgba(148,163,184,0.10)',   route: '/insurer/pipeline-ingestion/sftp',           defaultMeta: 'sftp.risk-node.io:22',     description: 'SSH file transfer — key or password auth'        },
  'webhooks':      { label: 'Webhooks',       icon: '🔗',  accent: '#00a572', bg: 'rgba(0,165,114,0.10)',     route: '/insurer/pipeline-ingestion/webhooks',       defaultMeta: 'AUTH: ••••••K892',         description: 'Outbound HTTP callbacks for platform events'     },
}

const STATUS_ACCENT: Record<ChannelStatus, string> = {
  active:  '#4edea3',
  syncing: '#4b8eff',
  idle:    '#64748b',
  error:   '#ff6464',
}

const ALL_TYPES = Object.keys(CHANNEL_DEFS) as ChannelType[]

export default function PipelineIngestion(): JSX.Element {
  const navigate = useNavigate()
  const {
    channels,
    loading,
    addChannel:    apiAddChannel,
    toggleChannel: apiToggleChannel,
    removeChannel: apiRemoveChannel,
  } = useIngestionChannels()
  const [showPicker, setShowPicker]   = useState(false)
  const [pickerType, setPickerType]   = useState<ChannelType | null>(null)

  function toggleEnabled(ch: Channel) {
    apiToggleChannel(ch.id, !ch.enabled).catch(console.error)
  }

  function removeChannel(id: string) {
    apiRemoveChannel(id).catch(console.error)
  }

  function addChannel() {
    if (!pickerType) return
    const def = CHANNEL_DEFS[pickerType]
    apiAddChannel(pickerType, def.label, def.defaultMeta)
      .catch(console.error)
    setShowPicker(false)
    setPickerType(null)
  }

  const activeCount  = channels.filter((c) => c.enabled && c.status === 'active').length
  const syncingCount = channels.filter((c) => c.status === 'syncing').length

  return (
    <S.PageShell>
      <S.HeaderRow>
        <div>
          <S.PageTitle>Pipeline &amp; Ingestion</S.PageTitle>
          <S.PageSubtitle>Manage automated capital flow and high-fidelity risk data vectors.</S.PageSubtitle>
        </div>

        <S.HeaderControls>
          <S.StatusBadge style={{ borderLeftColor: '#00a572' }}>
            <S.StatusDot style={{ background: '#00a572', boxShadow: '0 0 8px rgba(78,222,163,0.25)' }} />
            <S.StatusText style={{ color: '#4edea3' }}>Core Engine: Operational</S.StatusText>
          </S.StatusBadge>
          <S.StatusBadge style={{ borderLeftColor: '#4b8eff' }}>
            <S.StatusText style={{ color: '#4b8eff' }}>Last Sync: 2m ago</S.StatusText>
          </S.StatusBadge>
        </S.HeaderControls>
      </S.HeaderRow>

      <S.ContentArea>
        <S.CenterColumn>

          {/* ── Active Processing Queue ── */}
          <S.QueueCard>
            <S.QueueHeader>
              <S.QueueTitle>Active Processing Queue</S.QueueTitle>
              <S.StreamsBadge>4 Streams Running</S.StreamsBadge>
            </S.QueueHeader>

            <S.Grid3>
              <S.Step>
                <S.StepRow>
                  <S.StepLabel>Validating Schema...</S.StepLabel>
                  <S.StepPercent>82%</S.StepPercent>
                </S.StepRow>
                <S.ProgressBar><S.ProgressFill w="82%" /></S.ProgressBar>
                <S.Tag>S3_AUTO_PUSH</S.Tag>
              </S.Step>

              <S.Step style={{ opacity: 0.6 }}>
                <S.StepRow>
                  <S.StepLabel>Cleaning Geo-data...</S.StepLabel>
                  <S.StepPercent style={{ color: '#98a6bf' }}>Pending</S.StepPercent>
                </S.StepRow>
                <S.ProgressBar />
                <S.Tag style={{ background: '#171f33', color: '#98a6bf' }}>WAITING_FOR_S1</S.Tag>
              </S.Step>

              <S.Step style={{ opacity: 0.6 }}>
                <S.StepRow>
                  <S.StepLabel>Enriching Peril Vectors...</S.StepLabel>
                  <S.StepPercent style={{ color: '#98a6bf' }}>Pending</S.StepPercent>
                </S.StepRow>
                <S.ProgressBar />
                <S.Tag style={{ background: '#171f33', color: '#98a6bf' }}>WAITING_FOR_S2</S.Tag>
              </S.Step>
            </S.Grid3>
          </S.QueueCard>

          {/* ── Ingestion Channels ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ textTransform: 'uppercase', color: '#98a6bf', fontWeight: 800, fontSize: '0.75rem' }}>
                Ingestion Channels
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {syncingCount > 0 && (
                  <S.StreamsBadge>{syncingCount} Syncing</S.StreamsBadge>
                )}
                <span style={{ fontSize: '0.75rem', color: '#4edea3', fontFamily: 'JetBrains Mono, monospace' }}>
                  {activeCount} active
                </span>
              </div>
            </div>

            <S.ChannelGrid>
              {loading ? (
                <div style={{ gridColumn: '1 / -1', color: '#64748b', fontSize: '0.875rem', padding: '1.5rem 0' }}>
                  Loading channels…
                </div>
              ) : (
              <>{channels.map((ch) => {
                const def    = CHANNEL_DEFS[ch.type]
                const accent = ch.enabled ? STATUS_ACCENT[ch.status] : '#2a3348'
                return (
                  <S.ChannelCardBase key={ch.id} $accent={accent}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <S.IconAvatar bg={def.bg} color={def.accent} style={{ fontSize: '1.25rem' }}>
                          {def.icon}
                        </S.IconAvatar>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <S.Pill
                            tone={
                              !ch.enabled        ? 'muted'     :
                              ch.status === 'active'   ? 'secondary' :
                              ch.status === 'syncing'  ? 'primary'   :
                                                         'muted'
                            }
                          >
                            {ch.enabled ? ch.status : 'disabled'}
                          </S.Pill>
                          <button
                            onClick={() => removeChannel(ch.id)}
                            aria-label={`Remove ${def.label}`}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.875rem', fontFamily: 'Material Symbols Outlined', lineHeight: 1, padding: '0.125rem' }}
                            title="Remove channel"
                          >
                            close
                          </button>
                        </div>
                      </div>

                      <S.CardTitle>{def.label}</S.CardTitle>
                      <S.CardMeta style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                        {ch.meta}
                      </S.CardMeta>
                      <S.CardMeta style={{ fontSize: '0.6875rem', opacity: 0.7, marginTop: '0.25rem' }}>
                        {def.description}
                      </S.CardMeta>
                    </div>

                    <S.CardFooter>
                      <S.ConfigureBtn
                        onClick={() => navigate(`${def.route}/${(ch as any).dbId ?? ch.id}`)}
                        style={{ flex: 1 }}
                      >
                        Configure
                      </S.ConfigureBtn>
                      <S.ToggleBtn
                        active={ch.enabled}
                        onClick={() => toggleEnabled(ch)}
                        aria-label={ch.enabled ? `Disable ${def.label}` : `Enable ${def.label}`}
                      >
                        {ch.enabled ? 'On' : 'Off'}
                      </S.ToggleBtn>
                    </S.CardFooter>
                  </S.ChannelCardBase>
                )
              })}

              {/* Add channel card */}              <S.AddChannelCard
                type="button"
                onClick={() => { setShowPicker((v) => !v); setPickerType(null) }}
                aria-label="Add ingestion channel"
              >
                <S.AddChannelIcon aria-hidden>
                  {showPicker ? 'expand_less' : 'add_circle'}
                </S.AddChannelIcon>
                {showPicker ? 'Cancel' : 'Add Channel'}
              </S.AddChannelCard>

              {/* Picker panel — spans full width when open */}
              {showPicker && (
                <S.PickerPanel>
                  <S.PickerPanelTitle>Select a channel type</S.PickerPanelTitle>
                  <S.PickerGrid>
                    {ALL_TYPES.map((type) => {
                      const def = CHANNEL_DEFS[type]
                      return (
                        <S.PickerTypeCard
                          key={type}
                          type="button"
                          $accent={def.accent}
                          $selected={pickerType === type}
                          onClick={() => setPickerType(type)}
                        >
                          <S.PickerTypeIcon $bg={def.bg}>{def.icon}</S.PickerTypeIcon>
                          {def.label}
                          <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: '#64748b', textAlign: 'center', lineHeight: 1.3 }}>
                            {def.description}
                          </span>
                        </S.PickerTypeCard>
                      )
                    })}
                  </S.PickerGrid>
                  <S.PickerActions>
                    <S.GhostBtn type="button" onClick={() => { setShowPicker(false); setPickerType(null) }}>
                      Cancel
                    </S.GhostBtn>
                    <S.FillBtn
                      type="button"
                      onClick={addChannel}
                      disabled={!pickerType}
                      style={{ opacity: pickerType ? 1 : 0.4 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>add</span>
                      Add {pickerType ? CHANNEL_DEFS[pickerType].label : 'Channel'}
                    </S.FillBtn>
                  </S.PickerActions>
                </S.PickerPanel>
              )}
              </>)}
            </S.ChannelGrid>
          </div>

        </S.CenterColumn>

        {/* ── Queued Processes ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#98a6bf' }}>Queued Processes</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ background: 'transparent', color: '#98a6bf', border: 'none', cursor: 'pointer' }}>Filter</button>
              <button style={{ background: 'transparent', color: '#98a6bf', border: 'none', cursor: 'pointer' }}>Export</button>
            </div>
          </div>

          <S.QueuedList>
            <S.QueueItem>
              <S.ItemLeft>
                <S.IconAvatar bg="rgba(75,142,255,0.08)" color="#4b8eff">☁️</S.IconAvatar>
                <div>
                  <S.ItemTitle>S3 Bucket A</S.ItemTitle>
                  <S.ItemSub>BCH-00921-X</S.ItemSub>
                </div>
              </S.ItemLeft>

              <div style={{ flex: 1, minWidth: 300 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>Geo-data Cleaning [82%]</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#98a6bf' }}>1,240,402 Records</div>
                </div>
                <S.ProgressBar><S.ProgressFill w="82%" /></S.ProgressBar>
              </div>
            </S.QueueItem>

            <S.QueueItem>
              <S.ItemLeft>
                <S.IconAvatar bg="rgba(0,165,114,0.08)" color="#00a572">🔗</S.IconAvatar>
                <div>
                  <S.ItemTitle>Webhook Feed 04</S.ItemTitle>
                  <S.ItemSub>BCH-00918-Q</S.ItemSub>
                </div>
              </S.ItemLeft>

              <div style={{ flex: 1, minWidth: 300 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4b8eff' }}>Awaiting Schema Validation</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#98a6bf' }}>45,000 Records</div>
                </div>
                <S.ProgressBar>
                  <S.ProgressFill w="100%" style={{ background: 'rgba(75,142,255,0.25)' }} />
                </S.ProgressBar>
              </div>
            </S.QueueItem>

            <S.QueueItem>
              <S.ItemLeft>
                <S.IconAvatar bg="rgba(255,153,0,0.08)" color="#ff9900">🐇</S.IconAvatar>
                <div>
                  <S.ItemTitle>RabbitMQ Stream</S.ItemTitle>
                  <S.ItemSub>BCH-00922-R</S.ItemSub>
                </div>
              </S.ItemLeft>

              <div style={{ flex: 1, minWidth: 300 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#ff9900' }}>Enriching Peril Vectors [41%]</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#98a6bf' }}>8,901 Messages</div>
                </div>
                <S.ProgressBar><S.ProgressFill w="41%" style={{ background: '#ff9900' }} /></S.ProgressBar>
              </div>
            </S.QueueItem>
          </S.QueuedList>
        </div>
      </S.ContentArea>
    </S.PageShell>
  )
}

