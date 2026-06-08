import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import styled from 'styled-components'
import {
  getChannel,
  createChannel,
  patchChannel,
  testConnection,
  testConnectionAdhoc,
  listQueues,
  queueStatsByNames,
  createQueue,
  deleteQueue,
  updateQueuesConfig,
} from '../../api/ingestionChannels'
import * as S from './InsurerDashboard.styles'
import { colors, withAlpha } from '../../xds/colors'
import { Badge, Breadcrumb, Button, DataTable, FormField, ToggleSwitch } from '../../xds'

type QueueStatus = 'active' | 'idle' | 'slow'

interface QueueRow {
  name: string
  messages: string
  consumers: number
  memory: string
  status: QueueStatus
}

const QUEUE_DATA: QueueRow[] = [
  { name: 'policy_ingest_main',   messages: '1,204',  consumers: 24, memory: '12.4MB',  status: 'active' },
  { name: 'risk_modeling_stream', messages: '45,892', consumers: 64, memory: '842.1MB', status: 'active' },
  { name: 'claims_validation_bus',messages: '0',      consumers:  4, memory: '2.2MB',   status: 'idle'   },
  { name: 'audit_logger_replica', messages: '342',    consumers:  2, memory: '45.0MB',  status: 'slow'   },
]

const BAR_HEIGHTS = ['50%', '75%', '50%', '100%', '65%', '85%', '100%']

const STATUS_VARIANT: Record<QueueStatus, 'success' | 'neutral' | 'warning'> = {
  active: 'success',
  idle: 'neutral',
  slow: 'warning',
}

const PanelTitleIcon = styled.span`
  font-size: 1.125rem;
  color: ${colors.primarySoft};
`

const SyncIcon = styled.span<{ $spinning?: boolean }>`
  font-size: 0.875rem;
  ${(p) => (p.$spinning ? 'animation: spin 1s linear infinite;' : '')}
`

const ThroughputIcon = styled.span`
  font-size: 1.75rem;
  color: ${colors.accent};
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

const CreateQueueRow = styled.div`
  padding: 1rem 2rem;
  display: flex;
  gap: 1rem;
  align-items: center;
`

const CreateQueueField = styled.div`
  flex: 1;
`

const CreateQueueControls = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`

const TableScroll = styled.div`
  overflow-x: auto;
`

export default function RabbitMQConfig(): React.JSX.Element {
  const { channelId } = useParams() as { channelId?: string }
  const [channelLabel, setChannelLabel] = useState<string | null>(null)
  const [clusterUrl, setClusterUrl] = useState(
    'amqps://sovereign-prod-01.rmq.cloud.rabbitmq.com',
  )
  const [port, setPort] = useState('5672')
  const [vhost, setVhost] = useState('/ingest-main-bus')
  const [durable, setDurable] = useState(true)
  const [autoDelete, setAutoDelete] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'fail'>('idle')
  const [liveQueues, setLiveQueues] = useState<QueueRow[] | null>(null)
  const [loadingQueues, setLoadingQueues] = useState(false)
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const navigate = useNavigate()
  const [newQueueName, setNewQueueName] = useState('')
  const [newQueueDurable, setNewQueueDurable] = useState(true)
  const [newQueueAutoDelete, setNewQueueAutoDelete] = useState(false)
  const [creatingQueue, setCreatingQueue] = useState(false)

  async function handleTest() {
    setTestStatus('testing')
    try {
      const numericId = channelId && /^[0-9]+$/.test(channelId) ? channelId : null
      const res = numericId
        ? await testConnection(numericId)
        : await testConnectionAdhoc({ clusterUrl, port, vhost })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body?.ok !== false) {
        setTestStatus('ok')
        fetchQueues()
      } else {
        setTestStatus('fail')
      }
    } catch (err) {
      setTestStatus('fail')
    }
    // reset to idle after a short delay so UI can be retriggered
    setTimeout(() => setTestStatus('idle'), 2500)
  }

  async function handleSave() {
    setSaveStatus('saving')
    try {
      const body = {
        meta: clusterUrl,
        config: { port, vhost, durable, autoDelete },
      }
      if (channelId && /^[0-9]+$/.test(channelId)) {
        await patchChannel(channelId, body)
      } else {
        // create a new channel if none exists
        const data = await createChannel({ type: 'rabbitmq', label: 'RabbitMQ', ...body })
        if (data?.id) {
          setChannelLabel(data.label ?? channelLabel)
        }
      }
      setSaveStatus('ok')
      // refresh queues after save
      fetchQueues()
    } catch (err) {
      setSaveStatus('fail')
    }
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  useEffect(() => {
    if (!channelId) return
    getChannel(channelId)
      .then((data) => {
        if (data?.label) setChannelLabel(data.label)
        if (typeof data?.meta === 'string') setClusterUrl(String(data.meta))
        if (data?.config) {
          if (data.config.port) setPort(String(data.config.port))
          if (data.config.vhost) setVhost(String(data.config.vhost))
        }
        // fetch live queue stats if possible
        fetchQueues()
      })
      .catch(() => {})
  }, [channelId])

  async function fetchQueues(names?: string[]) {
    if (!channelId || !/^[0-9]+$/.test(channelId)) return
    setLoadingQueues(true)
    try {
      // Prefer the management-based listing endpoint (GET)
      const res = await listQueues(channelId)
      const body = await res.json().catch(() => null)
      if (res.ok && Array.isArray(body)) {
        const mapped: QueueRow[] = body.map((r: any) => {
          const msgs = Number(r.messages ?? 0)
          return {
            name: String(r.name),
            messages: String(msgs).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
            consumers: Number(r.consumers ?? 0),
            memory: r.memory ?? '-',
            status: msgs > 0 || (r.consumers ?? 0) > 0 ? 'active' : 'idle',
          }
        })
        setLiveQueues(mapped)
        return
      }
      // Fallback: if management listing not available, try the stats-by-name endpoint
      const fallback = await queueStatsByNames(channelId, names ?? QUEUE_DATA.map((q) => q.name))
      const fb = await fallback.json().catch(() => null)
      if (fallback.ok && Array.isArray(fb)) {
        const mapped: QueueRow[] = fb.map((r: any) => ({
          name: String(r.name),
          messages: String(Number(r.messages ?? 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
          consumers: Number(r.consumers ?? 0),
          memory: r.memory ?? '-',
          status: r.error ? 'idle' : 'active',
        }))
        setLiveQueues(mapped)
      }
    } catch (err) {
      // ignore
    } finally {
      setLoadingQueues(false)
    }
  }

  async function handleDeleteBrokerQueue(name: string) {
    if (!channelId || !/^[0-9]+$/.test(channelId)) return
    if (!window.confirm(`Delete queue "${name}" from broker? This cannot be undone.`)) {
      setMenuOpenFor(null)
      return
    }
    setActionLoading(true)
    try {
      const res = await deleteQueue(channelId, name)
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete queue')
      // refresh list
      await fetchQueues()
    } catch (err: any) {
      // simple feedback for now
      // eslint-disable-next-line no-alert
      alert('Failed to delete queue: ' + (err?.message ?? String(err)))
    } finally {
      setActionLoading(false)
      setMenuOpenFor(null)
    }
  }

  async function handleRemoveFromConfig(name: string) {
    if (!channelId || !/^[0-9]+$/.test(channelId)) return
    if (!window.confirm(`Remove queue "${name}" from saved channel config?`)) {
      setMenuOpenFor(null)
      return
    }
    setActionLoading(true)
    try {
      const res = await updateQueuesConfig(channelId, { queueName: name })
      if (!res.ok) throw new Error('Failed to update channel config')
      // refresh queues — config removal may affect what names are polled
      await fetchQueues()
    } catch (err: any) {
      // eslint-disable-next-line no-alert
      alert('Failed to update config: ' + (err?.message ?? String(err)))
    } finally {
      setActionLoading(false)
      setMenuOpenFor(null)
    }
  }

  async function handleCreateQueue() {
    if (!channelId || !/^[0-9]+$/.test(channelId)) {
      // eslint-disable-next-line no-alert
      alert('Please save this channel before creating queues')
      return
    }
    const name = newQueueName?.trim()
    if (!name) {
      // eslint-disable-next-line no-alert
      alert('Enter a queue name')
      return
    }
    setCreatingQueue(true)
    try {
      const res = await createQueue(channelId, { queueName: name, durable: newQueueDurable, autoDelete: newQueueAutoDelete })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to create queue')
      }
      // clear and refresh
      setNewQueueName('')
      await fetchQueues()
    } catch (err: any) {
      // eslint-disable-next-line no-alert
      alert('Failed to create queue: ' + (err?.message ?? String(err)))
    } finally {
      setCreatingQueue(false)
    }
  }

  return (
    <S.PageShell>
      <Breadcrumb
        items={[
          { label: 'Ingestion' },
          { label: 'Channels' },
          { label: channelLabel ?? 'Messaging Queue' },
        ]}
      />

      {/* Page header */}
      <S.RabbitPageHeader>
        <S.RabbitPageTitle>RabbitMQ Messaging Queue</S.RabbitPageTitle>
        <S.RabbitPageDesc>
          Configure sovereign communication protocols between ingestion nodes and risk modeling
          engines. Data persistence is guaranteed via redundant cluster partitioning.
        </S.RabbitPageDesc>
      </S.RabbitPageHeader>

      {/* Main grid */}
      <S.RabbitGrid>

        {/* ── Channel Configuration card ── */}
        <S.ConfigCard>
          <S.ConfigCardDecor aria-hidden>settings_ethernet</S.ConfigCardDecor>

          <S.ConfigCardTitle>
            <PanelTitleIcon className="material-symbols-outlined">tune</PanelTitleIcon>
            Channel Configuration
          </S.ConfigCardTitle>

          <S.FieldGroup>
            {/* Cluster URL */}
            <FormField
              id="rmq-cluster-url"
              label="Cluster URL"
              type="text"
              value={clusterUrl}
              onChange={(e) => setClusterUrl(e.target.value)}
              placeholder="Enter endpoint…"
            />

            {/* Port + Virtual Host */}
            <S.TwoFields>
              <FormField
                id="rmq-port"
                label="Port"
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
              <FormField
                id="rmq-vhost"
                label="Virtual Host"
                type="text"
                value={vhost}
                onChange={(e) => setVhost(e.target.value)}
              />
            </S.TwoFields>

            {/* Toggles */}
            <S.TogglesRow>
              <ToggleSwitch checked={durable}    onChange={() => setDurable(!durable)}       label="Durable" />
              <ToggleSwitch checked={autoDelete} onChange={() => setAutoDelete(!autoDelete)} label="Auto-Delete" />
            </S.TogglesRow>

            {/* Actions */}
            <S.BtnRow>
              <Button variant="ghost" type="button" onClick={handleTest} disabled={testStatus === 'testing'}>
                <SyncIcon className="material-symbols-outlined" $spinning={testStatus === 'testing'}>
                  sync
                </SyncIcon>
                {testStatus === 'testing' ? 'Testing…' : testStatus === 'ok' ? 'Connected ✓' : 'Test Connection'}
              </Button>
              <Button variant="primary" type="button" onClick={handleSave} disabled={saveStatus === 'saving'}>
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'ok' ? 'Saved ✓' : 'Save Channel'}
              </Button>
            </S.BtnRow>
          </S.FieldGroup>
        </S.ConfigCard>

        {/* ── Stats column ── */}
        <S.StatsColumn>
          {/* Throughput card */}
          <S.ThroughputCard>
            <S.ThroughputHeader>
              <div>
                <S.ThroughputLabel>Total Throughput</S.ThroughputLabel>
                <S.ThroughputNum>
                  4.82
                  <S.ThroughputUnit>GB/s</S.ThroughputUnit>
                </S.ThroughputNum>
              </div>
              <ThroughputIcon className="material-symbols-outlined">insights</ThroughputIcon>
            </S.ThroughputHeader>

            <S.BarsWrap aria-hidden>
              {BAR_HEIGHTS.map((h, i) => (
                <S.Bar key={i} $h={h} />
              ))}
            </S.BarsWrap>
          </S.ThroughputCard>

          {/* Active consumers / Acknowledge card */}
          <S.MetricsCard>
            <S.MetricsList>
              <S.MetricEntry $accent={colors.primarySoft}>
                <S.MetricLabel>Active Cons</S.MetricLabel>
                <S.MetricValue>128</S.MetricValue>
              </S.MetricEntry>
              <S.MetricEntry $accent={colors.accent}>
                <S.MetricLabel>Acknowledge</S.MetricLabel>
                <S.MetricValue>99.98%</S.MetricValue>
              </S.MetricEntry>
            </S.MetricsList>
          </S.MetricsCard>
        </S.StatsColumn>

        {/* ── Live Queues table ── */}
        <S.QueueSection>
          <S.QueueTableTop>
            <S.QueueTableTitle>Live Queues</S.QueueTableTitle>
            <HeaderRight>
              <Badge variant="success" dot>Streaming</Badge>
              <SearchIcon className="material-symbols-outlined">search</SearchIcon>
            </HeaderRight>
          </S.QueueTableTop>

          <CreateQueueRow>
            <CreateQueueField>
              <FormField
                id="new-queue-name"
                label="Create Queue"
                type="text"
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
                placeholder="e.g., submissions_inbound"
              />
            </CreateQueueField>
            <CreateQueueControls>
              <ToggleSwitch checked={newQueueDurable} onChange={() => setNewQueueDurable(!newQueueDurable)} label="Durable" />
              <ToggleSwitch checked={newQueueAutoDelete} onChange={() => setNewQueueAutoDelete(!newQueueAutoDelete)} label="Auto-Delete" />
              <Button variant="primary" type="button" onClick={handleCreateQueue} disabled={creatingQueue}>
                {creatingQueue ? 'Creating…' : 'Create Queue'}
              </Button>
            </CreateQueueControls>
          </CreateQueueRow>

          <TableScroll>
            <DataTable<QueueRow>
              columns={[
                { key: 'name', header: 'Queue Name', render: (row) => <S.QueueNameCell as="span">{row.name}</S.QueueNameCell> },
                { key: 'messages', header: 'Messages (MSGS)', render: (row) => <S.QueueMonoCell as="span">{row.messages}</S.QueueMonoCell> },
                { key: 'consumers', header: 'Consumers (CONS)', render: (row) => <S.QueueMonoCell as="span">{row.consumers}</S.QueueMonoCell> },
                { key: 'memory', header: 'Memory (MEM)', render: (row) => <S.QueueMonoCell as="span">{row.memory}</S.QueueMonoCell> },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>,
                },
              ]}
              data={liveQueues ?? QUEUE_DATA}
              rowActions={(row) => (
                <S.QueueMenuWrap onClick={(e) => e.stopPropagation()}>
                  <S.QueueActionBtn
                    aria-label={`Configure ${row.name}`}
                    onClick={() => {
                      if (!channelId || !/^[0-9]+$/.test(channelId)) return
                      const q = row.name
                      try {
                        // Emit an event so Storybook or other hosts can respond
                        if (typeof window !== 'undefined' && (window as any).dispatchEvent) {
                          const ev = new CustomEvent('ensured:openQueueConfig', { detail: { channelId, queueName: q } })
                          window.dispatchEvent(ev)
                        }
                      } catch (_) {
                        // ignore
                      }
                      navigate(`/insurer/pipeline-ingestion/rabbitmq/${channelId}/queue/${encodeURIComponent(row.name)}`)
                    }}
                  >
                    settings
                  </S.QueueActionBtn>
                  <S.QueueActionBtn
                    aria-label={`Actions for ${row.name}`}
                    onClick={() => setMenuOpenFor(menuOpenFor === row.name ? null : row.name)}
                  >
                    more_horiz
                  </S.QueueActionBtn>
                  {menuOpenFor === row.name && (
                    <S.QueueMenu className="rmq-queue-menu" role="menu">
                      <S.QueueMenuItem onClick={() => handleDeleteBrokerQueue(row.name)} disabled={actionLoading}>
                        Delete from broker
                      </S.QueueMenuItem>
                      <S.QueueMenuItem onClick={() => handleRemoveFromConfig(row.name)} disabled={actionLoading}>
                        Remove from saved config
                      </S.QueueMenuItem>
                    </S.QueueMenu>
                  )}
                </S.QueueMenuWrap>
              )}
            />
          </TableScroll>
        </S.QueueSection>

      </S.RabbitGrid>

      {/* Ambient glow layer */}
      <GlowLayer aria-hidden />
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
