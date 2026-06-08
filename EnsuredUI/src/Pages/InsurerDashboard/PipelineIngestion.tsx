import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { useNavigate } from 'react-router'
import { listQueues, getChannelSubmissions } from '../../api/ingestionChannels'
import * as S from './InsurerDashboard.styles'
import { useIngestionChannels, type ChannelType, type Channel } from '../../lib/useIngestionChannels'
import SubNavigation, { type Tab } from '../../xds/components/SubNavigation'
import { Badge, Button } from '../../xds'
import { colors, withAlpha } from '../../xds/colors'

type PipelineTabId = 'processing' | 'channels' | 'queues'

const PIPELINE_TABS: Tab[] = [
  { id: 'processing', label: 'Active Processing' },
  { id: 'channels',   label: 'Ingestion Channels' },
  { id: 'queues',     label: 'Queue Records' },
]

type ChannelStatus = 'active' | 'syncing' | 'idle' | 'error'
type ProcessState = 'active' | 'idle'

interface QueueRecord {
  channelId: string
  channelLabel: string
  name: string
  messages: number
  consumers: number
  vhost?: string
  error?: string | null
}

interface ChannelSubmission {
  id: number
  submissionNumber: string
  status: string
  source: string | null
  transport: string | null
  receivedAt: string | null
}

const SubmissionExpander = styled.button`
  margin-top: 10px;
  background: transparent;
  border: 1px solid ${withAlpha(colors.primary, 0.22)};
  border-radius: 8px;
  color: ${colors.primarySoft};
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.4rem 0.6rem;
  text-align: left;
  width: 100%;
`

const SubmissionMeta = styled.div<{ $error?: boolean }>`
  color: ${({ $error }) => ($error ? colors.errorSoft : colors.onSurfaceVariant)};
  font-size: 0.75rem;
  padding: 0.5rem 0;
`

const SubmissionRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: baseline;
  border-top: 1px solid ${withAlpha(colors.primarySoft, 0.08)};
  padding: 0.4rem 0;
`

const SubmissionNumber = styled.span`
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.onSurfaceStrong};
  font-size: 0.75rem;
`

const SubmissionStatus = styled.span`
  color: ${colors.onSurfaceVariant};
  font-size: 0.75rem;
`

const SubmissionDate = styled.span`
  color: ${colors.neutral[500]};
  font-size: 0.6875rem;
`

const SubNavSpacer = styled.div`
  margin-bottom: 4px;
`

const HeaderQueueControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const RefreshButton = styled.button`
  background: transparent;
  border: none;
  color: ${colors.onSurfaceVariant};
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

const GridSpan = styled.div`
  grid-column: 1 / -1;
  color: ${colors.neutral[500]};
  font-size: 0.875rem;
  padding: 1.5rem 0;
`

const ChannelHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`

const ChannelIcon = styled(S.IconAvatar)`
  font-size: 1.25rem;
`

const PickerTypeDesc = styled.span`
  font-size: 0.6875rem;
  font-weight: 400;
  color: ${colors.neutral[500]};
  text-align: center;
  line-height: 1.3;
`

const FillBtnIcon = styled.span`
  font-size: 0.875rem;
`

const ErrorText = styled.div`
  color: ${colors.errorSoft};
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
`

const QueueItemBody = styled.div`
  flex: 1;
  min-width: 300px;
`

const QueueItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 1rem;
`

const QueueState = styled.div<{ $active: boolean }>`
  font-family: 'JetBrains Mono', monospace;
  color: ${({ $active }) => ($active ? colors.accent : colors.onSurfaceVariant)};
`

const QueueStats = styled.div`
  display: flex;
  gap: 1rem;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.onSurfaceVariant};
  font-size: 0.8125rem;
`

const QueueErrorText = styled.div`
  color: ${colors.errorSoft};
  font-size: 0.75rem;
  margin-top: 0.5rem;
`

const SummaryStatLabel = styled.div`
  font-size: 0.6875rem;
  text-transform: uppercase;
  color: ${colors.onSurfaceVariant};
  font-weight: 800;
`

const EmptyText = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 0.875rem;
`

const StepProgressRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
`

const MutedStep = styled(S.Step)`
  opacity: 0.6;
`

const PendingPercent = styled(S.StepPercent)`
  color: ${colors.onSurfaceVariant};
`

const WaitingTag = styled(S.Tag)`
  background: ${colors.surfaceRaised};
  color: ${colors.onSurfaceVariant};
`

const CardMetaSpaced = styled(S.CardMeta)`
  margin-top: 4px;
`

const CardMetaSmall = styled(S.CardMeta)`
  font-size: 0.6875rem;
  opacity: 0.8;
  margin-top: 0.25rem;
`

const CardMetaTiny = styled(S.CardMeta)`
  font-size: 0.6875rem;
  margin-top: 0.4rem;
`

const SummaryStatTop = styled(S.CardMeta)`
  margin-top: 0;
`

const CHANNEL_DEFS: Record<ChannelType, {
  label: string
  icon: string
  accent: string
  bg: string
  route: string
  defaultMeta: string
  description: string
}> = {
  'rabbitmq':      { label: 'RabbitMQ',      icon: '🐇',  accent: colors.dataViz.orange, bg: withAlpha(colors.dataViz.orange, 0.1),     route: '/insurer/pipeline-ingestion/rabbitmq',      defaultMeta: 'amqp://localhost:5672',    description: 'AMQP message broker — durable queues & routing'  },
  'email-sso':     { label: 'Email SSO',      icon: '📧',  accent: colors.vendor.googleBlue, bg: withAlpha(colors.vendor.googleBlue, 0.1),    route: '/insurer/pipeline-ingestion/email-sso',      defaultMeta: 'Google Workspace',         description: 'Ingest via OAuth-connected Google / O365 mailbox' },
  'cloud-storage': { label: 'Cloud Storage',  icon: '☁️',  accent: colors.primary, bg: withAlpha(colors.primary, 0.1),    route: '/insurer/pipeline-ingestion/cloud-storage',  defaultMeta: '/raw-exposure-data',       description: 'S3 · GCS · Azure Blob — watch-path polling'      },
  'sftp':          { label: 'SFTP',           icon: '🖥️',  accent: colors.neutral[400], bg: withAlpha(colors.neutral[400], 0.1),   route: '/insurer/pipeline-ingestion/sftp',           defaultMeta: 'sftp.risk-node.io:22',     description: 'SSH file transfer — key or password auth'        },
  'webhooks':      { label: 'Webhooks',       icon: '🔗',  accent: colors.accentStrong, bg: withAlpha(colors.accentStrong, 0.1),     route: '/insurer/pipeline-ingestion/webhooks',       defaultMeta: 'AUTH: ••••••K892',         description: 'Outbound HTTP callbacks for platform events'     },
}

const STATUS_ACCENT: Record<ChannelStatus, string> = {
  active:  colors.accent,
  syncing: colors.primary,
  idle:    colors.neutral[500],
  error:   colors.dangerBright,
}

const ALL_TYPES = Object.keys(CHANNEL_DEFS) as ChannelType[]

function isQueueSourceChannel(channel: Channel): boolean {
  return (typeof channel.meta === 'string' && channel.meta.trim().length > 0) ||
         typeof channel.config?.managementApiUrl === 'string'
}

function getProcessState(channel: Channel): ProcessState {
  return channel.enabled && channel.status === 'active' ? 'active' : 'idle'
}

export default function PipelineIngestion({ embedded = false, channelsOnly = false }: { embedded?: boolean; channelsOnly?: boolean } = {}): React.JSX.Element {
  const navigate = useNavigate()
  const {
    channels,
    loading,
    error,
    addChannel:    apiAddChannel,
    toggleChannel: apiToggleChannel,
    removeChannel: apiRemoveChannel,
  } = useIngestionChannels()
  const [activeTab, setActiveTab]     = useState<PipelineTabId>(embedded || channelsOnly ? 'channels' : 'processing')
  const [showPicker, setShowPicker]   = useState(false)
  const [pickerType, setPickerType]   = useState<ChannelType | null>(null)
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([])
  const [loadingQueues, setLoadingQueues] = useState(false)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [expandedChannelId, setExpandedChannelId] = useState<string | null>(null)
  const [channelSubmissions, setChannelSubmissions] = useState<Record<string, ChannelSubmission[]>>({})
  const [channelSubsLoading, setChannelSubsLoading] = useState<Record<string, boolean>>({})
  const [channelSubsError, setChannelSubsError] = useState<Record<string, string | null>>({})

  const queueSourceChannels = useMemo(
    () => channels.filter(isQueueSourceChannel),
    [channels]
  )
  
  const maxQueueDepth = useMemo(
    () => Math.max(1, ...queueRecords.map((queue) => queue.messages)),
    [queueRecords]
  )

  useEffect(() => {
    let cancelled = false

    async function fetchQueueRecords() {
      if (loading) return

      if (queueSourceChannels.length === 0) {
        setQueueRecords([])
        setQueueError(null)
        setLoadingQueues(false)
        setLastRefreshedAt(new Date().toLocaleTimeString())
        return
      }

      setLoadingQueues(true)
      setQueueError(null)

      try {
        const responses = await Promise.all(
          queueSourceChannels.map(async (channel) => {
            try {
              const res = await listQueues(channel.dbId)
              const body = await res.json().catch(() => null)
              if (!res.ok || !Array.isArray(body)) return [] as QueueRecord[]

              return body.map((queue: any) => ({
                channelId: `ch-${channel.dbId}`,
                channelLabel: CHANNEL_DEFS[channel.type].label,
                name: String(queue.name),
                messages: Number(queue.messages ?? 0),
                consumers: Number(queue.consumers ?? 0),
                vhost: queue.vhost,
                error: queue.error ?? null,
              }))
            } catch (err) {
              return [] as QueueRecord[]
            }
          })
        )

        if (cancelled) return

        const merged = responses.flat().sort((a, b) => b.messages - a.messages || a.name.localeCompare(b.name))
        setQueueRecords(merged)
        setLastRefreshedAt(new Date().toLocaleTimeString())
        setQueueError(merged.length === 0 ? 'No live queue records were returned for the configured pipeline sources.' : null)
      } catch (err) {
        if (!cancelled) {
          setQueueRecords([])
          setQueueError(err instanceof Error ? err.message : 'Failed to load queue records')
        }
      } finally {
        if (!cancelled) setLoadingQueues(false)
      }
    }

    void fetchQueueRecords()

    return () => {
      cancelled = true
    }
  }, [loading, queueSourceChannels, refreshToken])

  const activeCount = channels.filter((channel) => channel.enabled && channel.status === 'active').length
  const idleCount = channels.filter((channel) => !channel.enabled || channel.status === 'idle').length
  const queueCount = queueRecords.length
  const totalMessages = queueRecords.reduce((sum, queue) => sum + queue.messages, 0)
  const busiestQueue = queueRecords[0]

  function refreshQueues() {
    setRefreshToken((value) => value + 1)
  }

  async function toggleChannelSubmissions(channel: Channel) {
    const next = expandedChannelId === channel.id ? null : channel.id
    setExpandedChannelId(next)
    if (!next || channelSubmissions[channel.id]) return

    setChannelSubsLoading((map) => ({ ...map, [channel.id]: true }))
    setChannelSubsError((map) => ({ ...map, [channel.id]: null }))
    try {
      const res = await getChannelSubmissions(channel.dbId)
      if (!res.ok) throw new Error(`Failed to load submissions: ${res.status}`)
      const data = (await res.json()) as ChannelSubmission[]
      setChannelSubmissions((map) => ({ ...map, [channel.id]: Array.isArray(data) ? data : [] }))
    } catch (err) {
      setChannelSubsError((map) => ({ ...map, [channel.id]: err instanceof Error ? err.message : 'Failed to load submissions' }))
    } finally {
      setChannelSubsLoading((map) => ({ ...map, [channel.id]: false }))
    }
  }

  function toggleEnabled(channel: Channel) {
    apiToggleChannel(channel.id, !channel.enabled).catch(console.error)
  }

  function removeChannelHandler(channelId: string) {
    apiRemoveChannel(channelId).catch(console.error)
  }

  function handleAddChannel() {
    if (!pickerType) return
    const def = CHANNEL_DEFS[pickerType]
    apiAddChannel(pickerType, def.label, def.defaultMeta).catch(console.error)
    setShowPicker(false)
    setPickerType(null)
  }

  return (
    <>
      {!embedded && (
        <S.HeaderRow>
          <div>
            <S.PageTitle>Pipeline Monitor</S.PageTitle>
            <S.PageSubtitle>Track active and idle pipeline processes, plus the live records waiting in queue.</S.PageSubtitle>
          </div>
          <S.HeaderControls>
            <Badge variant="success" dot>{activeCount} active processes</Badge>
            <Badge variant="info" dot>{idleCount} idle processes</Badge>
            <Badge variant="info">Last Sync: {lastRefreshedAt ?? 'just now'}</Badge>
          </S.HeaderControls>
        </S.HeaderRow>
      )}

      <S.ContentArea>
        <S.CenterColumn>

          {!channelsOnly && (
            <SubNavSpacer>
              <SubNavigation
                tabs={PIPELINE_TABS}
                activeId={activeTab}
                onChange={(id) => setActiveTab(id as PipelineTabId)}
                label={null}
              />
            </SubNavSpacer>
          )}

          {/* ── Active Processing Queue ── */}
          {activeTab === 'processing' && (
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
                <StepProgressRow>
                  <S.ProgressBar><S.ProgressFill w="82%" /></S.ProgressBar>
                  <S.Tag>S3_AUTO_PUSH</S.Tag>
                </StepProgressRow>
              </S.Step>

              <MutedStep>
                <S.StepRow>
                  <S.StepLabel>Pending...</S.StepLabel>
                  <PendingPercent>Pending</PendingPercent>
                </S.StepRow>
                <S.ProgressBar />
                <WaitingTag>WAITING_FOR_S1</WaitingTag>
              </MutedStep>

              <MutedStep>
                <S.StepRow>
                  <S.StepLabel>Pending...</S.StepLabel>
                  <PendingPercent>Pending</PendingPercent>
                </S.StepRow>
                <S.ProgressBar />
                <WaitingTag>WAITING_FOR_S2</WaitingTag>
              </MutedStep>
            </S.Grid3>
          </S.QueueCard>
          )}

          {/* ── Ingestion Channels ── */}
          {activeTab === 'channels' && (
          <S.QueueCard>
            <S.QueueHeader>
              <S.QueueTitle>Pipeline Processes</S.QueueTitle>
              <HeaderQueueControls>
                {busiestQueue && <S.StreamsBadge>{busiestQueue.name} is the busiest queue</S.StreamsBadge>}
                <RefreshButton type="button" onClick={refreshQueues}>
                  Refresh
                </RefreshButton>
              </HeaderQueueControls>
            </S.QueueHeader>

            <S.ConfigGrid>
              {loading ? (
                <GridSpan>
                  Loading channels…
                </GridSpan>
              ) : (
                <>
                  {channels.map((channel) => {
                    const def = CHANNEL_DEFS[channel.type]
                    const state = getProcessState(channel)
                    return (
                      <S.ChannelCard key={channel.id}>
                        <div>
                          <ChannelHead>
                            <ChannelIcon bg={def.bg} color={def.accent}>
                              {def.icon}
                            </ChannelIcon>
                            <S.Pill tone={state === 'active' ? 'secondary' : 'muted'}>{state}</S.Pill>
                          </ChannelHead>

                          <S.CardTitle>{def.label}</S.CardTitle>
                          <CardMetaSpaced>
                            {channel.enabled ? 'enabled' : 'disabled'} · {channel.status}
                          </CardMetaSpaced>
                          <CardMetaSmall>
                            {def.description}
                          </CardMetaSmall>
                          <CardMetaTiny>
                            Organization #{channel.organizationId ?? '—'}
                          </CardMetaTiny>
                        </div>

                        <S.CardFooter>
                          <S.ConfigureBtn onClick={() => navigate(`${def.route}/${channel.dbId}`)}>Open</S.ConfigureBtn>
                          <S.ToggleBtn
                            active={channel.enabled}
                            onClick={() => toggleEnabled(channel)}
                            aria-label={channel.enabled ? `Disable ${def.label}` : `Enable ${def.label}`}
                          >
                            {channel.enabled ? 'On' : 'Off'}
                          </S.ToggleBtn>
                        </S.CardFooter>

                        <SubmissionExpander
                          type="button"
                          onClick={() => void toggleChannelSubmissions(channel)}
                          aria-expanded={expandedChannelId === channel.id}
                        >
                          {expandedChannelId === channel.id ? '▾' : '▸'} {channel.submissionCount} submission{channel.submissionCount === 1 ? '' : 's'} from this channel
                        </SubmissionExpander>

                        {expandedChannelId === channel.id && (
                          <div>
                            {channelSubsLoading[channel.id] ? (
                              <SubmissionMeta>Loading submissions…</SubmissionMeta>
                            ) : channelSubsError[channel.id] ? (
                              <SubmissionMeta $error>{channelSubsError[channel.id]}</SubmissionMeta>
                            ) : (channelSubmissions[channel.id]?.length ?? 0) === 0 ? (
                              <SubmissionMeta>No submissions generated from this channel yet.</SubmissionMeta>
                            ) : (
                              <div>
                                {channelSubmissions[channel.id].map((submission) => (
                                  <SubmissionRow key={submission.id}>
                                    <SubmissionNumber>{submission.submissionNumber}</SubmissionNumber>
                                    <SubmissionStatus>{submission.status}</SubmissionStatus>
                                    <SubmissionDate>{submission.receivedAt ? new Date(submission.receivedAt).toLocaleDateString() : ''}</SubmissionDate>
                                  </SubmissionRow>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </S.ChannelCard>
                    )
                  })}

                  <S.AddChannelCard
                    type="button"
                    onClick={() => { setShowPicker((value) => !value); setPickerType(null) }}
                    aria-label="Add ingestion channel"
                  >
                    <S.AddChannelIcon aria-hidden>
                      {showPicker ? 'expand_less' : 'add_circle'}
                    </S.AddChannelIcon>
                    {showPicker ? 'Cancel' : 'Add Channel'}
                  </S.AddChannelCard>

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
                              <PickerTypeDesc>
                                {def.description}
                              </PickerTypeDesc>
                            </S.PickerTypeCard>
                          )
                        })}
                      </S.PickerGrid>
                      <S.PickerActions>
                        <Button type="button" variant="ghost" onClick={() => { setShowPicker(false); setPickerType(null) }}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAddChannel}
                          disabled={!pickerType}
                        >
                          <FillBtnIcon className="material-symbols-outlined">add</FillBtnIcon>
                          Add {pickerType ? CHANNEL_DEFS[pickerType].label : 'Channel'}
                        </Button>
                      </S.PickerActions>
                    </S.PickerPanel>
                  )}
                </>
              )}
            </S.ConfigGrid>
          </S.QueueCard>
          )}

          {/* ── Queue Records ── */}
          {activeTab === 'queues' && (
          <>
          <S.QueueCard>
            <S.QueueHeader>
              <S.QueueTitle>Queue Records</S.QueueTitle>
              <S.StreamsBadge>{loadingQueues ? 'Refreshing live queue stats…' : `Last updated ${lastRefreshedAt ?? 'just now'}`}</S.StreamsBadge>
            </S.QueueHeader>

            {error && (
              <ErrorText>
                Channel load error: {error}
              </ErrorText>
            )}
            {queueError && (
              <ErrorText>
                Queue load error: {queueError}
              </ErrorText>
            )}

            {queueRecords.length > 0 ? (
              <S.QueuedList>
                {queueRecords.map((queue) => (
                  <S.QueueItem key={`${queue.channelId}:${queue.name}`}>
                    <S.ItemLeft>
                      <S.IconAvatar bg={withAlpha(colors.primary, 0.08)} color={colors.primary}>📥</S.IconAvatar>
                      <div>
                        <S.ItemTitle>{queue.name}</S.ItemTitle>
                        <S.ItemSub>{queue.channelLabel}{queue.vhost ? ` · ${queue.vhost}` : ''}</S.ItemSub>
                      </div>
                    </S.ItemLeft>

                    <QueueItemBody>
                      <QueueItemRow>
                        <QueueState $active={queue.messages > 0}>
                          {queue.messages > 0 ? 'Active' : 'Idle'} queue
                        </QueueState>
                        <QueueStats>
                          <span>{queue.messages.toLocaleString()} records</span>
                          <span>{queue.consumers} consumers</span>
                        </QueueStats>
                      </QueueItemRow>
                      <S.ProgressBar>
                        <S.ProgressFill w={`${queue.messages > 0 ? Math.max(8, Math.round((queue.messages / maxQueueDepth) * 100)) : 8}%`} />
                      </S.ProgressBar>
                      {queue.error && (
                        <QueueErrorText>
                          {queue.error}
                        </QueueErrorText>
                      )}
                    </QueueItemBody>
                  </S.QueueItem>
                ))}
              </S.QueuedList>
            ) : (
              <EmptyText>
                {loading ? 'Loading pipeline channels…' : 'No live queue records are currently available.'}
              </EmptyText>
            )}
          </S.QueueCard>

          <S.SummaryCard>
            <S.SummaryInner>
              <S.StatRow>
                <div>
                  <SummaryStatLabel>Live queue depth</SummaryStatLabel>
                  <S.StatValue>{totalMessages.toLocaleString()}</S.StatValue>
                </div>
                <S.Pill tone="secondary">{queueCount} queues</S.Pill>
              </S.StatRow>
              <SummaryStatTop>
                Monitoring the configured ingestion sources and surfacing the latest queue load.
              </SummaryStatTop>
            </S.SummaryInner>
          </S.SummaryCard>
          </>
          )}

        </S.CenterColumn>
      </S.ContentArea>
    </>
  )
}
