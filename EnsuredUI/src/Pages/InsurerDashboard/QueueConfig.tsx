import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { getApiBase } from '../../lib/api'
import * as S from './InsurerDashboard.styles'

type ActionType = 'ingest' | 'archive' | 'forward' | 'drop'

export default function QueueConfig(): JSX.Element {
  const { channelId, queueName } = useParams() as { channelId?: string; queueName?: string }
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<Record<string, any>>({})
  const [action, setAction] = useState<ActionType>('ingest')
  const [forwardUrl, setForwardUrl] = useState('')
  const [persist, setPersist] = useState(true)

  useEffect(() => {
    if (!channelId || !queueName) return
    setLoading(true)
    const base = getApiBase()
    fetch(`${base}/api/ingestion-channels/${channelId}`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error('Not found'); return r.json() })
      .then((data) => {
        const qc = data?.config?.queueConfigs ?? {}
        const qcfg = qc?.[queueName] ?? {}
        setConfig(qcfg)
        setAction(qcfg.action ?? 'ingest')
        setForwardUrl(qcfg.forwardUrl ?? '')
        setPersist(typeof qcfg.persist === 'boolean' ? qcfg.persist : true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [channelId, queueName])

  async function handleSave() {
    if (!channelId || !queueName) return
    setSaving(true)
    try {
      const base = getApiBase()
      const payload = { queueConfig: { action, forwardUrl: action === 'forward' ? forwardUrl : undefined, persist } }
      const res = await fetch(`${base}/api/ingestion-channels/${channelId}/queues/${encodeURIComponent(queueName)}/config`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save')
      // navigate back to channel view
      navigate(-1)
    } catch (err: any) {
      // eslint-disable-next-line no-alert
      alert('Failed to save queue configuration: ' + (err?.message ?? String(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <S.PageShell>
      <S.Breadcrumb aria-label="breadcrumb">
        <S.BreadcrumbItem onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>Back</S.BreadcrumbItem>
        <S.BreadcrumbSep aria-hidden>›</S.BreadcrumbSep>
        <S.BreadcrumbActive>Queue Configuration</S.BreadcrumbActive>
      </S.Breadcrumb>

      <S.RabbitPageHeader>
        <S.RabbitPageTitle>Queue: {queueName}</S.RabbitPageTitle>
        <S.RabbitPageDesc>Configure routing and handling for messages delivered to this queue.</S.RabbitPageDesc>
      </S.RabbitPageHeader>

      <S.ConfigCard>
        <S.FieldGroup>
          <div>
            <S.FieldLabel>Action</S.FieldLabel>
            <S.Select value={action} onChange={(e) => setAction(e.target.value as ActionType)}>
              <option value="ingest">Ingest into pipeline (default)</option>
              <option value="archive">Archive to cold storage</option>
              <option value="forward">Forward to HTTP endpoint</option>
              <option value="drop">Drop messages (discard)</option>
            </S.Select>
          </div>

          {action === 'forward' && (
            <div>
              <S.FieldLabel>Forward URL</S.FieldLabel>
              <S.Input value={forwardUrl} onChange={(e) => setForwardUrl(e.target.value)} placeholder="https://example.com/ingest" />
            </div>
          )}

          <div>
            <S.FieldLabel>Persist messages</S.FieldLabel>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <S.ToggleLabel onClick={() => setPersist(true)}>
                <S.ToggleTrack $checked={persist}>
                  <S.ToggleKnob $checked={persist} />
                </S.ToggleTrack>
                <S.ToggleText>Yes</S.ToggleText>
              </S.ToggleLabel>
              <S.ToggleLabel onClick={() => setPersist(false)}>
                <S.ToggleTrack $checked={!persist}>
                  <S.ToggleKnob $checked={!persist} />
                </S.ToggleTrack>
                <S.ToggleText>No</S.ToggleText>
              </S.ToggleLabel>
            </div>
          </div>

          <S.BtnRow>
            <S.GhostBtn type="button" onClick={() => navigate(-1)}>Cancel</S.GhostBtn>
            <S.FillBtn type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</S.FillBtn>
          </S.BtnRow>
        </S.FieldGroup>
      </S.ConfigCard>
    </S.PageShell>
  )
}
