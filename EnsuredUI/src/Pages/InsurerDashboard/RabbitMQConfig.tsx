import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { getApiBase } from '../../lib/api'
import * as S from './InsurerDashboard.styles'

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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <S.ToggleLabel onClick={onChange}>
      <S.ToggleTrack $checked={checked}>
        <S.ToggleKnob $checked={checked} />
      </S.ToggleTrack>
      <S.ToggleText>{label}</S.ToggleText>
    </S.ToggleLabel>
  )
}

export default function RabbitMQConfig(): JSX.Element {
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
      const base = getApiBase()
      const numericId = channelId && /^[0-9]+$/.test(channelId) ? channelId : null
      let res: Response
      if (numericId) {
        res = await fetch(`${base}/api/ingestion-channels/${numericId}/test-connection`, {
          method: 'POST',
          credentials: 'include',
        })
      } else {
        res = await fetch(`${base}/api/ingestion-channels/test-connection`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clusterUrl, port, vhost }),
        })
      }
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
      const base = getApiBase()
      const body = {
        meta: clusterUrl,
        config: { port, vhost, durable, autoDelete },
      }
      if (channelId && /^[0-9]+$/.test(channelId)) {
        const res = await fetch(`${base}/api/ingestion-channels/${channelId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Failed to save channel')
      } else {
        // create a new channel if none exists
        const res = await fetch(`${base}/api/ingestion-channels`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'rabbitmq', label: 'RabbitMQ', ...body }),
        })
        if (!res.ok) throw new Error('Failed to create channel')
        const data = await res.json()
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
    const base = getApiBase()
    fetch(`${base}/api/ingestion-channels/${channelId}`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error('Not found'); return r.json() })
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
      const base = getApiBase()
      // Prefer the management-based listing endpoint (GET)
      const res = await fetch(`${base}/api/ingestion-channels/${channelId}/queues`, {
        method: 'GET',
        credentials: 'include',
      })
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
      const fallback = await fetch(`${base}/api/ingestion-channels/${channelId}/queues`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueNames: names ?? QUEUE_DATA.map((q) => q.name) }),
      })
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
      const base = getApiBase()
      const res = await fetch(`${base}/api/ingestion-channels/${channelId}/queues/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
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
      const base = getApiBase()
      const res = await fetch(`${base}/api/ingestion-channels/${channelId}/queues-config`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueName: name }),
      })
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
      const base = getApiBase()
      const res = await fetch(`${base}/api/ingestion-channels/${channelId}/queues/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueName: name, durable: newQueueDurable, autoDelete: newQueueAutoDelete }),
      })
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
      {/* Breadcrumb */}
      <S.Breadcrumb aria-label="breadcrumb">
        <S.BreadcrumbItem>Ingestion</S.BreadcrumbItem>
        <S.BreadcrumbSep aria-hidden>›</S.BreadcrumbSep>
        <S.BreadcrumbItem>Channels</S.BreadcrumbItem>
        <S.BreadcrumbSep aria-hidden>›</S.BreadcrumbSep>
        <S.BreadcrumbActive>{channelLabel ?? 'Messaging Queue'}</S.BreadcrumbActive>
      </S.Breadcrumb>

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
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '1.125rem', color: '#adc6ff' }}
            >
              tune
            </span>
            Channel Configuration
          </S.ConfigCardTitle>

          <S.FieldGroup>
            {/* Cluster URL */}
            <div>
              <S.FieldLabel htmlFor="rmq-cluster-url">Cluster URL</S.FieldLabel>
              <S.Input
                id="rmq-cluster-url"
                type="text"
                value={clusterUrl}
                onChange={(e) => setClusterUrl(e.target.value)}
                placeholder="Enter endpoint…"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
              />
            </div>

            {/* Port + Virtual Host */}
            <S.TwoFields>
              <div>
                <S.FieldLabel htmlFor="rmq-port">Port</S.FieldLabel>
                <S.Input
                  id="rmq-port"
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <S.FieldLabel htmlFor="rmq-vhost">Virtual Host</S.FieldLabel>
                <S.Input
                  id="rmq-vhost"
                  type="text"
                  value={vhost}
                  onChange={(e) => setVhost(e.target.value)}
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
                />
              </div>
            </S.TwoFields>

            {/* Toggles */}
            <S.TogglesRow>
              <Toggle checked={durable}    onChange={() => setDurable(!durable)}       label="Durable" />
              <Toggle checked={autoDelete} onChange={() => setAutoDelete(!autoDelete)} label="Auto-Delete" />
            </S.TogglesRow>

            {/* Actions */}
            <S.BtnRow>
              <S.GhostBtn type="button" onClick={handleTest} disabled={testStatus === 'testing'}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '0.875rem', ...(testStatus === 'testing' ? { animation: 'spin 1s linear infinite' } : {}) }}
                >
                  sync
                </span>
                {testStatus === 'testing' ? 'Testing…' : testStatus === 'ok' ? 'Connected ✓' : 'Test Connection'}
              </S.GhostBtn>
              <S.FillBtn type="button" onClick={handleSave} disabled={saveStatus === 'saving'}>
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'ok' ? 'Saved ✓' : 'Save Channel'}
              </S.FillBtn>
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
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.75rem', color: '#4edea3' }}
              >
                insights
              </span>
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
              <S.MetricEntry $accent="#adc6ff">
                <S.MetricLabel>Active Cons</S.MetricLabel>
                <S.MetricValue>128</S.MetricValue>
              </S.MetricEntry>
              <S.MetricEntry $accent="#4edea3">
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <S.StreamingBadge>
                <S.StreamingDot aria-hidden />
                Streaming
              </S.StreamingBadge>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.25rem', color: '#64748b', cursor: 'pointer' }}
              >
                search
              </span>
            </div>
          </S.QueueTableTop>

          <div style={{ padding: '1rem 2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <S.FieldLabel htmlFor="new-queue-name">Create Queue</S.FieldLabel>
              <S.Input
                id="new-queue-name"
                type="text"
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
                placeholder="e.g., submissions_inbound"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Toggle checked={newQueueDurable} onChange={() => setNewQueueDurable(!newQueueDurable)} label="Durable" />
              <Toggle checked={newQueueAutoDelete} onChange={() => setNewQueueAutoDelete(!newQueueAutoDelete)} label="Auto-Delete" />
              <S.FillBtn type="button" onClick={handleCreateQueue} disabled={creatingQueue}>
                {creatingQueue ? 'Creating…' : 'Create Queue'}
              </S.FillBtn>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <S.QueueTable>
              <thead>
                <tr>
                  <S.QueueTH>Queue Name</S.QueueTH>
                  <S.QueueTH>Messages (MSGS)</S.QueueTH>
                  <S.QueueTH>Consumers (CONS)</S.QueueTH>
                  <S.QueueTH>Memory (MEM)</S.QueueTH>
                  <S.QueueTH>Status</S.QueueTH>
                  <S.QueueTH style={{ textAlign: 'right' }}>Actions</S.QueueTH>
                </tr>
              </thead>
              <tbody>
                {(liveQueues ?? QUEUE_DATA).map((row) => (
                  <S.QueueTR key={row.name}>
                    <S.QueueNameCell>{row.name}</S.QueueNameCell>
                    <S.QueueMonoCell>{row.messages}</S.QueueMonoCell>
                    <S.QueueMonoCell>{row.consumers}</S.QueueMonoCell>
                    <S.QueueMonoCell>{row.memory}</S.QueueMonoCell>
                    <S.QueueTD>
                      <S.QueueStatusChip $status={row.status}>
                        {row.status}
                      </S.QueueStatusChip>
                    </S.QueueTD>
                    <S.QueueTD style={{ textAlign: 'right' }}>
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
                    </S.QueueTD>
                  </S.QueueTR>
                ))}
              </tbody>
            </S.QueueTable>
          </div>
        </S.QueueSection>

      </S.RabbitGrid>

      {/* Ambient glow layer */}
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
