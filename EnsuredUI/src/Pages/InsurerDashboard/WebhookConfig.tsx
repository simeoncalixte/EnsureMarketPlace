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
  DataTable,
  FormField,
  MaskedSecretInput,
  ToggleSwitch,
} from '../../xds'

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

const STATUS_VARIANT: Record<DeliveryStatus, 'success' | 'warning' | 'danger'> = {
  delivered: 'success',
  pending: 'warning',
  failed: 'danger',
}

const PanelTitleIcon = styled.span<{ $color: string }>`
  font-size: 1.125rem;
  color: ${(p) => p.$color};
`

const EventCountSpacer = styled.span`
  margin-left: auto;
  font-size: 0.8125rem;
  font-weight: 400;
  color: ${colors.neutral[500]};
`

const LogsHeaderRight = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`

const ClearLogsIcon = styled.span`
  font-size: 1.125rem;
  color: ${colors.neutral[500]};
  cursor: pointer;
`

const DestCell = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: ${colors.neutral[500]};
`

const LatencyCell = styled.span`
  font-family: 'JetBrains Mono', monospace;
`

const HttpCell = styled.span<{ $status: number }>`
  font-family: 'JetBrains Mono', monospace;
  color: ${(p) => (p.$status === 200 ? colors.accent : p.$status === 0 ? colors.vendor.googleYellow : colors.dangerBright)};
`

const TableScroll = styled.div`
  overflow-x: auto;
`

const BtnIcon = styled.span`
  font-size: 0.875rem;
`

const ReplayIcon = styled.span`
  font-size: 0.75rem;
`

const OptionName = styled(S.WebhookEventName)`
  font-family: inherit;
  font-size: 0.875rem;
`

export default function WebhookConfig(): React.JSX.Element {
  const { channelId } = useParams() as { channelId?: string }
  const [channelLabel, setChannelLabel] = useState<string | null>(null)
  const [enabledEvents, setEnabledEvents]   = useState<boolean[]>(EVENT_TYPES.map(() => true))
  const [deliveryOpts, setDeliveryOpts]     = useState([true, true, true, true])
  const [secret, setSecret]                 = useState('whsec_s0v3re1gNcAp_X9pzQwLm4rKjTbU')
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
    getChannel(channelId)
      .then((data: any) => {
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
      <Breadcrumb
        items={[
          { label: 'Ingestion' },
          { label: 'Channels' },
          { label: channelLabel ?? 'Webhooks' },
        ]}
      />

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
            <PanelTitleIcon $color={colors.primarySoft} className="material-symbols-outlined">link</PanelTitleIcon>
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
              <MaskedSecretInput
                id="wh-secret"
                value={secret}
                onChange={setSecret}
                readOnly
              />
            </S.WebhookSecretField>
            <S.WebhookRotateBtn type="button" onClick={rotateSecret} disabled={rotating} aria-label="Rotate signing secret">
              <BtnIcon className="material-symbols-outlined">
                {rotating ? 'hourglass_top' : 'autorenew'}
              </BtnIcon>
              {rotating ? 'Rotating…' : 'Rotate'}
            </S.WebhookRotateBtn>
          </S.WebhookSecretRow>

          <S.FieldGroup>
            <FormField
              id="wh-target"
              label="Target Endpoint (outbound push)"
              type="url"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="https://your-service.com/hook"
            />

            <S.BtnRow>
              <Button variant="ghost" type="button">
                <BtnIcon className="material-symbols-outlined">send</BtnIcon>
                Send Test Payload
              </Button>
              <Button variant="primary" type="button">Save Endpoint</Button>
            </S.BtnRow>
          </S.FieldGroup>
        </S.WebhookEndpointCard>

        {/* ── Event subscriptions card ── */}
        <S.WebhookEventsCard>
          <S.WebhookEventsTitle>
            <PanelTitleIcon $color={colors.accent} className="material-symbols-outlined">bolt</PanelTitleIcon>
            Event Subscriptions
            <EventCountSpacer>
              {activeEvents} / {EVENT_TYPES.length} active
            </EventCountSpacer>
          </S.WebhookEventsTitle>

          {EVENT_TYPES.map((ev, i) => (
            <S.WebhookEventRow key={ev.name}>
              <S.WebhookEventMeta>
                <S.WebhookEventName>{ev.name}</S.WebhookEventName>
                <S.WebhookEventDesc>{ev.desc}</S.WebhookEventDesc>
              </S.WebhookEventMeta>
              <ToggleSwitch
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
            <PanelTitleIcon $color={colors.vendor.googleYellow} className="material-symbols-outlined">tune</PanelTitleIcon>
            Delivery Options
          </S.WebhookDeliveryTitle>

          {DELIVERY_OPTIONS.map((opt, i) => (
            <S.WebhookEventRow key={opt.label}>
              <S.WebhookEventMeta>
                <OptionName>{opt.label}</OptionName>
                <S.WebhookEventDesc>{opt.desc}</S.WebhookEventDesc>
              </S.WebhookEventMeta>
              <ToggleSwitch
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
            <LogsHeaderRight>
              <Badge variant="success" dot>Live</Badge>
              <ClearLogsIcon
                className="material-symbols-outlined"
                title="Clear logs"
                onClick={() => setLogs([])}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setLogs([]) }}
              >
                delete_sweep
              </ClearLogsIcon>
            </LogsHeaderRight>
          </S.WebhookLogsTop>

          <TableScroll>
            <DataTable<DeliveryLog>
              emptyText="No deliveries yet"
              columns={[
                { key: 'event', header: 'Event', render: (log) => <S.WebhookEventChip>{log.event}</S.WebhookEventChip> },
                { key: 'destination', header: 'Destination', render: (log) => <DestCell>{log.destination}</DestCell> },
                { key: 'timestamp', header: 'Timestamp', render: (log) => log.timestamp },
                { key: 'latency', header: 'Latency', render: (log) => <LatencyCell>{log.latency}</LatencyCell> },
                {
                  key: 'httpStatus',
                  header: 'HTTP',
                  render: (log) => <HttpCell $status={log.httpStatus}>{log.httpStatus === 0 ? '—' : log.httpStatus}</HttpCell>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (log) => <Badge variant={STATUS_VARIANT[log.status]}>{log.status}</Badge>,
                },
              ]}
              data={logs}
              rowActions={(log) => (
                <S.WebhookReplayBtn
                  type="button"
                  onClick={() => replayLog(log.id)}
                  aria-label={`Replay ${log.id}`}
                >
                  <ReplayIcon className="material-symbols-outlined">replay</ReplayIcon>
                  Replay
                </S.WebhookReplayBtn>
              )}
            />
          </TableScroll>
        </S.WebhookLogsSection>

      </S.WebhookGrid>
    </S.PageShell>
  )
}
