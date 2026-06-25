import React, { useEffect, useState } from 'react'
import * as S from '../InsurerDashboard/InsurerDashboard.styles'
import Button from '../../xds/components/Button'
import DataTable, { DataTableColumn } from '../../xds/components/DataTable'
import FormField from '../../xds/components/FormField'
import { useAuthMe } from '../../lib/useAuthMe'
import {
  Simulation as SimulationRecord,
  SimulationInput,
  listSimulations,
  runSimulation,
  deleteSimulation,
} from '../../api/governance'
import {
  Field,
  FieldLabel,
  MutedText,
  ErrorText,
  FormGrid,
  Toolbar,
  HelperText,
  MonoCell,
  OptionSelect,
  useCapacityDefinitions,
  useSelectedDefinition,
  DefinitionPicker,
} from './governanceShared'

type SimResult = {
  projectedUtilizationPct?: number | null
  projectedExposure?: number | null
  withinAppetite?: boolean
  notes?: string
}

export default function Simulation() {
  const { user } = useAuthMe()
  const orgId = user?.organizationId ?? null

  const { definitions } = useCapacityDefinitions(orgId)
  const { selectedId, select } = useSelectedDefinition(definitions)

  const [simulations, setSimulations] = useState<SimulationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [name, setName] = useState('New Simulation')
  const [simulationType, setSimulationType] = useState('')
  const [exposure, setExposure] = useState('')
  const [capacity, setCapacity] = useState('')
  const [notional, setNotional] = useState('')

  const reload = async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      setSimulations(await listSimulations(orgId))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load simulations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!orgId) return
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  if (!orgId) {
    return (
      <S.ContentArea>
        <S.LeftColumn>
          <S.Section>
            <S.SectionHeader><S.SectionTitle>Simulation and Testing</S.SectionTitle><S.SectionRule /></S.SectionHeader>
            <MutedText>No organization is associated with your account.</MutedText>
          </S.Section>
        </S.LeftColumn>
      </S.ContentArea>
    )
  }

  const onRun = async () => {
    setBusy(true)
    setError(null)
    try {
      const inputParams: Record<string, unknown> = {}
      if (exposure !== '') inputParams.exposure = Number(exposure)
      if (capacity !== '') inputParams.capacity = Number(capacity)
      if (notional !== '') inputParams.notional = Number(notional)
      const input: SimulationInput = {
        name,
        simulationType,
        capacityDefinitionId: selectedId ?? null,
        inputParams,
      }
      await runSimulation(orgId, input)
      await reload()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to run simulation')
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (id: number) => {
    setBusy(true)
    setError(null)
    try {
      await deleteSimulation(orgId, id)
      await reload()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete simulation')
    } finally {
      setBusy(false)
    }
  }

  const columns: DataTableColumn<SimulationRecord>[] = [
    { key: 'name', header: 'Name', render: (s) => s.name },
    { key: 'type', header: 'Type', render: (s) => s.simulationType },
    { key: 'status', header: 'Status', render: (s) => s.status },
    { key: 'ranAt', header: 'Ran At', render: (s) => (s.ranAt ? new Date(s.ranAt).toLocaleString() : '—') },
    {
      key: 'utilization',
      header: 'Utilization',
      render: (s) => {
        const r = s.results as SimResult | null
        return r?.projectedUtilizationPct != null ? `${r.projectedUtilizationPct}%` : '—'
      },
    },
    {
      key: 'withinAppetite',
      header: 'Within Appetite',
      render: (s) => {
        const r = s.results as SimResult | null
        return r?.withinAppetite ? '✓' : r ? '✗' : '—'
      },
    },
    {
      key: 'result',
      header: 'Result',
      render: (s) => (s.results ? <MonoCell>{JSON.stringify(s.results)}</MonoCell> : <MutedText>—</MutedText>),
    },
  ]

  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>Simulation and Testing</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          {error && <ErrorText>{error}</ErrorText>}

          <FormGrid>
            <HelperText>Validate appetite, capacity and referral behaviour before deployment.</HelperText>

            <FormField label="Name" value={name} onChange={(e: any) => setName(e.target.value)} />

            <Field label="Simulation Type">
              <OptionSelect
                organizationId={orgId}
                optionKey="governance.simulation.type"
                value={simulationType}
                onChange={setSimulationType}
                includeBlank="—"
              />
            </Field>

            <Toolbar>
              <DefinitionPicker definitions={definitions} selectedId={selectedId} onSelect={select} />
            </Toolbar>

            <FormField label="Exposure" type="number" value={exposure} onChange={(e: any) => setExposure(e.target.value)} />
            <FormField label="Capacity" type="number" value={capacity} onChange={(e: any) => setCapacity(e.target.value)} />
            <FormField label="Notional" type="number" value={notional} onChange={(e: any) => setNotional(e.target.value)} />

            <div>
              <Button variant="primary" disabled={busy} onClick={onRun}>{busy ? 'Running…' : 'Run Simulation'}</Button>
            </div>
          </FormGrid>

          <div style={{ marginTop: 28 }}>
            {loading && <MutedText>Loading…</MutedText>}
            <DataTable<SimulationRecord>
              columns={columns}
              data={simulations}
              emptyText="No simulations yet."
              rowActions={(s) => (
                <Button variant="ghost" disabled={busy} onClick={() => onDelete(s.id)}>Delete</Button>
              )}
            />
          </div>
        </S.Section>
      </S.LeftColumn>
    </S.ContentArea>
  )
}
