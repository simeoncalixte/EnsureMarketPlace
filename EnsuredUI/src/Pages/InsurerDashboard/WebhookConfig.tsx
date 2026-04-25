import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { getApiBase } from '../../lib/api'
import * as S from './InsurerDashboard.styles'

type DeliveryStatus = 'delivered' | 'pending' | 'failed'

interface DeliveryLog {
  id: string
  event: string
  destination: string
  timestamp: string
  latency: string
  httpStatus: number
  status: DeliveryStatus
}

const WEBHOOK_URL = 'https://ingest.sovereigncap.io/webhooks/v1/events'

const EVENT_TYPES = [
  { name: 'submission.received',   desc: 'New risk submission ingested from any source channel' },
  { name: 'policy.bound',          desc: 'Policy binding confirmed and recorded to ledger' },
  { name: 'claim.opened',          desc: 'New claim created against an active policy' },
  { name: 'claim.updated',         desc: 'Claim status or reserve amount changed' },
  { name: 'exposure.recalculated', desc: 'Exposure model re-run triggered by updated data' },
  { name: 'audit.flagged',         desc: 'Compliance rule triggered an audit flag' },
]

const DELIVERY_OPTIONS = [
  { label: 'Retry on failure',    desc: 'Automatically retry failed deliveries with exponential back-off (max 5).' },
  { label: 'Include raw payload', desc: 'Attach the full JSON payload to each webhook delivery.' },
  { label: 'HMAC signature',      desc: 'Sign every request with the webhook secret for receiver verification.' },
  { label: 'TLS verification',    desc: 'Reject deliveries to endpoints with invalid or self-signed certificates.' },
]

const SEED_LOGS: DeliveryLog[] = [
  { id: 'evt_Kvx9a',  event: 'submission.received',   destination: 'https://broker.io/hooks',    timestamp: '1m ago',   latency: '42 ms',  httpStatus: 200, status: 'delivered' },
  { id: 'evt_M2wLd',  event: 'policy.bound',           destination: 'https://cedant.co/wh',      timestamp: '4m ago',   latency: '138 ms', httpStatus: 200, status: 'delivered' },
  { id: 'evt_PqR84',  event: 'claim.opened',           destination: 'https://claims-svc/hook',   timestamp: '12m ago',  latency: '—',      httpStatus: 0,   status: 'pending'   },
  { id: 'evt_7sFtG',  event: 'exposure.recalculated',  destination: 'https://analytics/ingest',  timestamp: '28m ago',  latency: '61 ms',  httpStatus: 200, status: 'delivered' },
  { id: 'evt_ZxJn1',  event: 'audit.flagged',          destination: 'https://compliance/events', timestamp: '1h ago',   latency: '—',      httpStatus: 503, status: 'failed'    },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <S.ToggleLabel onClick={onChange}>
      <S.ToggleTrack $checked={checked}><S.ToggleKnob $checked={checked} /></S.ToggleTrack>
    </S.ToggleLabel>
  )
}

export default function WebhookConfig(): JSX.Element {
  const { channelId } = useParams() as { channelId?: string }
  const [channelLabel, setChannelLabel] = useState<string | null>(null)
  const [enabledEvents, setEnabledEvents]   = useState<boolean[]>(EVENT_TYPES.map(() => true))
  const [deliveryOpts, setDeliveryOpts]     = useState([true, true, true, true])
  const [secret, setSecret]                 = useState('whsec_s0v3re1gNcAp_X9pzQwLm4rKjTbU')
  const [showSecret, setShowSecret]         = useState(false)
  const [copied, setCopied]                 = useState(false)
  const [rotating, setRotating]             = useState(false)
  const [target, setTarget]                 = useState('')
  const [logs, setLogs]                     = useState<DeliveryLog[]>(SEED_LOGS)

  const activeEvents = enabledEvents.filter(Boolean).length

  function copyUrl() {
    navigator.clipboard.writeText(WEBHOOK_URL).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function rotateSecret() {
    setRotating(true)
    setTimeout(() => {
      const rand = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12)
      setSecret(`whsec_${rand}`)
      setRotating(false)
    }, 900)
  }

  function replayLog(id: string) {
    setLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'pending' as const, latency: '—', httpStatus: 0 } : l))
    )
    setTimeout(() => {
      setLogs((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, status: 'delivered' as const, latency: `${40 + Math.floor(Math.random() * 80)} ms`, httpStatus: 200 } : l
        )
      )
    }, 1200)
  }

  useEffect(() => {
    if (!channelId) return
    const base = getApiBase()
    fetch(`${base}/api/ingestion-channels/${channelId}`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error('Not found'); return r.json() })
      .then((data) => {
        if (data?.label) setChannelLabel(data.label)
        if (data?.config?.target) setTarget(String(data.config.target))
        if (typeof data?.meta === 'string' && !data?.config?.target) {
          // keep meta as fallback if config target not present
          setTarget(String(data.meta))
        }
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
        <S.BreadcrumbActive>{channelLabel ?? 'Webhooks'}</S.BreadcrumbActive>
      </S.Breadcrumb>

      {/* Header */}
      <S.EmailPageHeader>
        <S.EmailPageTitle>Webhook Configuration</S.EmailPageTitle>
        <S.EmailPageDesc>
          Subscribe external systems to Sovereign Cap platform events via authenticated HTTP
          callbacks. Toggle which events trigger deliveries, manage HMAC signing secrets, and
          inspect the full delivery log with one-click replay.
        </S.EmailPageDesc>
      </S.EmailPageHeader>

      <S.WebhookGrid>

        {/* ── Endpoint card ── */}
        <S.WebhookEndpointCard>
          <S.WebhookEndpointDecor aria-hidden>webhook</S.WebhookEndpointDecor>

          <S.WebhookEndpointTitle>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: '#adc6ff' }}>
              link
            </span>
            Inbound Endpoint
          </S.WebhookEndpointTitle>

          <div>
            <S.FieldLabel as="span">Listening URL</S.FieldLabel>
            <S.WebhookUrlDisplay>
              <S.WebhookUrlText>{WEBHOOK_URL}</S.WebhookUrlText>
              <S.WebhookCopyBtn type="button" aria-label="Copy URL" onClick={copyUrl}>
                {copied ? 'check' : 'content_copy'}
              </S.WebhookCopyBtn>
            </S.WebhookUrlDisplay>
          </div>

          <S.WebhookSecretRow>
            <S.WebhookSecretField>
              <S.FieldLabel htmlFor="wh-secret">Signing Secret</S.FieldLabel>
              <S.MaskedInput>
                <S.Input
                  id="wh-secret"
                  type={showSecret ? 'text' : 'password'}
                  value={secret}
                  readOnly
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8125rem', cursor: 'default' }}
                />
                <S.EyeBtn
                  type="button"
                  aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? 'visibility_off' : 'visibility'}
                </S.EyeBtn>
              </S.MaskedInput>
            </S.WebhookSecretField>
            <S.WebhookRotateBtn type="button" onClick={rotateSecret} disabled={rotating} aria-label="Rotate signing secret">
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                {rotating ? 'hourglass_top' : 'autorenew'}
              </span>
              {rotating ? 'Rotating…' : 'Rotate'}
            </S.WebhookRotateBtn>
          </S.WebhookSecretRow>

          <S.FieldGroup>
            <div>
              <S.FieldLabel htmlFor="wh-target">Target Endpoint (outbound push)</S.FieldLabel>
              <S.Input
                id="wh-target"
                type="url"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="https://your-service.com/hook"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}
              />
            </div>

            <S.BtnRow>
              <S.GhostBtn type="button">
                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>send</span>
                Send Test Payload
              </S.GhostBtn>
              <S.FillBtn type="button">Save Endpoint</S.FillBtn>
            </S.BtnRow>
          </S.FieldGroup>
        </S.WebhookEndpointCard>

        {/* ── Event subscriptions card ── */}
        <S.WebhookEventsCard>
          <S.WebhookEventsTitle>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: '#4edea3' }}>
              bolt
            </span>
            Event Subscriptions
            <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', fontWeight: 400, color: '#64748b' }}>
              {activeEvents} / {EVENT_TYPES.length} active
            </span>
          </S.WebhookEventsTitle>

          {EVENT_TYPES.map((ev, i) => (
            <S.WebhookEventRow key={ev.name}>
              <S.WebhookEventMeta>
                <S.WebhookEventName>{ev.name}</S.WebhookEventName>
                <S.WebhookEventDesc>{ev.desc}</S.WebhookEventDesc>
              </S.WebhookEventMeta>
              <Toggle
                checked={enabledEvents[i]}
                onChange={() =>
                  setEnabledEvents((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
                }
              />
            </S.WebhookEventRow>
          ))}
        </S.WebhookEventsCard>

        {/* ── Delivery options card ── */}
        <S.WebhookDeliveryCard>
          <S.WebhookDeliveryTitle>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: '#fbbc05' }}>
              tune
            </span>
            Delivery Options
          </S.WebhookDeliveryTitle>

          {DELIVERY_OPTIONS.map((opt, i) => (
            <S.WebhookEventRow key={opt.label}>
              <S.WebhookEventMeta>
                <S.WebhookEventName style={{ fontFamily: 'inherit', fontSize: '0.875rem' }}>{opt.label}</S.WebhookEventName>
                <S.WebhookEventDesc>{opt.desc}</S.WebhookEventDesc>
              </S.WebhookEventMeta>
              <Toggle
                checked={deliveryOpts[i]}
                onChange={() =>
                  setDeliveryOpts((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
                }
              />
            </S.WebhookEventRow>
          ))}
        </S.WebhookDeliveryCard>

        {/* ── Delivery log ── */}
        <S.WebhookLogsSection>
          <S.WebhookLogsTop>
            <S.WebhookLogsTitle>Delivery Log</S.WebhookLogsTitle>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <S.StreamingBadge>
                <S.StreamingDot aria-hidden />
                Live
              </S.StreamingBadge>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.125rem', color: '#64748b', cursor: 'pointer' }}
                title="Clear logs"
                onClick={() => setLogs([])}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setLogs([]) }}
              >
                delete_sweep
              </span>
            </div>
          </S.WebhookLogsTop>

          <div style={{ overflowX: 'auto' }}>
            <S.WebhookTable>
              <thead>
                <tr>
                  <S.WebhookTh>Event</S.WebhookTh>
                  <S.WebhookTh>Destination</S.WebhookTh>
                  <S.WebhookTh>Timestamp</S.WebhookTh>
                  <S.WebhookTh>Latency</S.WebhookTh>
                  <S.WebhookTh>HTTP</S.WebhookTh>
                  <S.WebhookTh>Status</S.WebhookTh>
                  <S.WebhookTh style={{ textAlign: 'right' }}>Actions</S.WebhookTh>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <S.WebhookTd colSpan={7} style={{ textAlign: 'center', color: '#475569', padding: '2rem' }}>
                      No deliveries yet
                    </S.WebhookTd>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <S.WebhookTr key={log.id}>
                      <S.WebhookTd>
                        <S.WebhookEventChip>{log.event}</S.WebhookEventChip>
                      </S.WebhookTd>
                      <S.WebhookTd style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#64748b' }}>
                        {log.destination}
                      </S.WebhookTd>
                      <S.WebhookTd>{log.timestamp}</S.WebhookTd>
                      <S.WebhookTd style={{ fontFamily: "'JetBrains Mono', monospace" }}>{log.latency}</S.WebhookTd>
                      <S.WebhookTd
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: log.httpStatus === 200 ? '#4edea3' : log.httpStatus === 0 ? '#fbbc05' : '#ff6464',
                        }}
                      >
                        {log.httpStatus === 0 ? '—' : log.httpStatus}
                      </S.WebhookTd>
                      <S.WebhookTd>
                        <S.WebhookStatusChip $status={log.status}>{log.status}</S.WebhookStatusChip>
                      </S.WebhookTd>
                      <S.WebhookTd style={{ textAlign: 'right' }}>
                        <S.WebhookReplayBtn
                          type="button"
                          onClick={() => replayLog(log.id)}
                          aria-label={`Replay ${log.id}`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>replay</span>
                          Replay
                        </S.WebhookReplayBtn>
                      </S.WebhookTd>
                    </S.WebhookTr>
                  ))
                )}
              </tbody>
            </S.WebhookTable>
          </div>
        </S.WebhookLogsSection>

      </S.WebhookGrid>
    </S.PageShell>
  )
}
