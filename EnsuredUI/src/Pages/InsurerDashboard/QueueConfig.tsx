import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import styled from 'styled-components'
import { getChannel, updateQueueConfig } from '../../api/ingestionChannels'
import * as S from './InsurerDashboard.styles'
import { Breadcrumb, Button, FormField, Select, ToggleSwitch } from '../../xds'

type ActionType = 'ingest' | 'archive' | 'forward' | 'drop'

const ToggleRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
`

export default function QueueConfig(): React.JSX.Element {
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
    getChannel(channelId)
      .then((data) => {
        const qc = (data?.config as any)?.queueConfigs ?? {}
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
      const payload = { queueConfig: { action, forwardUrl: action === 'forward' ? forwardUrl : undefined, persist } }
      const res = await updateQueueConfig(channelId, queueName, payload)
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
      <Breadcrumb
        items={[
          { label: 'Back', onClick: (e) => { e.preventDefault(); navigate(-1) } },
          { label: 'Queue Configuration' },
        ]}
      />

      <S.RabbitPageHeader>
        <S.RabbitPageTitle>Queue: {queueName}</S.RabbitPageTitle>
        <S.RabbitPageDesc>Configure routing and handling for messages delivered to this queue.</S.RabbitPageDesc>
      </S.RabbitPageHeader>

      <S.ConfigCard>
        <S.FieldGroup>
          <div>
            <S.FieldLabel>Action</S.FieldLabel>
            <Select value={action} onChange={(e) => setAction(e.target.value as ActionType)}>
              <option value="ingest">Ingest into pipeline (default)</option>
              <option value="archive">Archive to cold storage</option>
              <option value="forward">Forward to HTTP endpoint</option>
              <option value="drop">Drop messages (discard)</option>
            </Select>
          </div>

          {action === 'forward' && (
            <FormField
              label="Forward URL"
              value={forwardUrl}
              onChange={(e) => setForwardUrl(e.target.value)}
              placeholder="https://example.com/ingest"
            />
          )}

          <div>
            <S.FieldLabel>Persist messages</S.FieldLabel>
            <ToggleRow>
              <ToggleSwitch checked={persist} onChange={() => setPersist(true)} label="Yes" />
              <ToggleSwitch checked={!persist} onChange={() => setPersist(false)} label="No" />
            </ToggleRow>
          </div>

          <S.BtnRow>
            <Button variant="ghost" type="button" onClick={() => navigate(-1)}>Cancel</Button>
            <Button variant="primary" type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </S.BtnRow>
        </S.FieldGroup>
      </S.ConfigCard>
    </S.PageShell>
  )
}
