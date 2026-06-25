import React, { useEffect, useMemo, useState } from 'react'
import * as S from '../InsurerDashboard/InsurerDashboard.styles'
import Button from '../../xds/components/Button'
import DataTable, { DataTableColumn } from '../../xds/components/DataTable'
import FormField from '../../xds/components/FormField'
import Input from '../../xds/components/Input'
import Select from '../../xds/components/Select'
import SearchableSelect from '../../xds/components/SearchableSelect'
import Textarea from '../../xds/components/Textarea'
import NumberInput from '../../xds/components/NumberInput'
import ToggleSwitch from '../../xds/components/ToggleSwitch'
import SegmentedSwitch from '../../xds/components/SegmentedSwitch'
import Card from '../../xds/components/Card'
import Badge from '../../xds/components/Badge'
import { useAuthMe } from '../../lib/useAuthMe'
import {
  RuleSet,
  RuleSetInput,
  RuleConditionNode,
  RuleAction,
  RuleActionType,
  RuleAssignment,
  ValueSource,
  RuleRunResult,
  CatalogModel,
  CatalogField,
  listRuleSets,
  createRuleSet,
  updateRuleSet,
  deleteRuleSet,
  runRuleSet,
} from '../../api/governance'
import {
  Field,
  FieldLabel,
  MutedText,
  ErrorText,
  Toolbar,
  HelperText,
  useCapacityDefinitions,
  useModelFieldCatalog,
  useSelectedDefinition,
  DefinitionPicker,
  Banner,
  Pre,
  EditorHead,
  Crumb,
  EditorTitle,
  HeaderActions,
  CardStack,
  CardGrid,
  StepRow,
  StepNum,
  StepTitle,
} from './governanceShared'

// ─── small helpers ───────────────────────────────────────────────────────────

const NUMERIC_OPERATORS = ['greater_than', 'less_than', 'greater_or_equal', 'less_or_equal']
const NO_VALUE_OPERATORS = ['exists', 'not_exists']
const LIST_OPERATORS = ['in_list', 'not_in_list']

// Built-in vocabularies. Connectors, operators and action types are engine
// capabilities (the runner only implements these), not configurable business
// lists — so they live here and can never render empty.
const ACTION_OPTIONS: { value: RuleActionType; label: string }[] = [
  { value: 'modify', label: 'Update this record' },
  { value: 'create', label: 'Create a record' },
  { value: 'update', label: 'Update matching records' },
  { value: 'delete', label: 'Delete matching records' },
]

const CONNECTOR_OPTIONS: { value: NonNullable<RuleConditionNode['connector']>; label: string }[] = [
  { value: 'AND', label: 'All (AND)' },
  { value: 'OR', label: 'Any (OR)' },
  { value: 'NOT', label: 'None (NOT)' },
]

// Exactly the operators the runner's compare() implements (radius operators are
// intentionally omitted — the engine does not support them).
const OPERATOR_OPTIONS: { value: string; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'greater_or_equal', label: 'greater than or equal' },
  { value: 'less_or_equal', label: 'less than or equal' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'exists', label: 'exists' },
  { value: 'not_exists', label: 'does not exist' },
  { value: 'in_list', label: 'in list' },
  { value: 'not_in_list', label: 'not in list' },
]

function isGroup(node: RuleConditionNode): boolean {
  return Array.isArray(node.conditions) || node.connector != null
}

/** Path without its leading model-key segment, e.g. `submission.status` → `status`. */
function stripPrefix(path: string): string {
  return path.split('.').slice(1).join('.') || path
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ')
}

function fieldsFor(catalog: CatalogModel[], modelKey: string | null | undefined): CatalogField[] {
  return catalog.find((m) => m.key === modelKey)?.fields ?? []
}

/** Own (non-association) writable fields for a model — used as action targets. */
function ownFields(catalog: CatalogModel[], modelKey: string | null | undefined): CatalogField[] {
  return fieldsFor(catalog, modelKey).filter((f) => !f.via && f.path.split('.').length === 2)
}

function fieldKind(fields: CatalogField[], path: string): CatalogField['kind'] | null {
  return fields.find((f) => f.path === path)?.kind ?? null
}

/** Catalog models as searchable-select options. */
function modelOptions(catalog: CatalogModel[]): { value: string; label: string }[] {
  return catalog.map((m) => ({ value: m.key, label: m.model }))
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function RulesEngine() {
  const { user } = useAuthMe()
  const orgId = user?.organizationId ?? null
  const { definitions } = useCapacityDefinitions(orgId)
  const { selectedId, select } = useSelectedDefinition(definitions)
  const { models: catalog } = useModelFieldCatalog(orgId)

  const [ruleSets, setRuleSets] = useState<RuleSet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    if (!orgId || !selectedId) {
      setRuleSets([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      setRuleSets(await listRuleSets(orgId, selectedId))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load rule sets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, selectedId])

  if (!orgId) {
    return (
      <S.ContentArea>
        <S.LeftColumn>
          <S.Section>
            <S.SectionHeader><S.SectionTitle>Rules Engine</S.SectionTitle><S.SectionRule /></S.SectionHeader>
            <MutedText>No organization is associated with your account.</MutedText>
          </S.Section>
        </S.LeftColumn>
      </S.ContentArea>
    )
  }

  const editing = ruleSets.find((r) => r.id === editingId) ?? null

  const onNew = async () => {
    if (!selectedId) return
    setBusy(true)
    try {
      const subjectModel = catalog.find((m) => m.key === 'submission')?.key ?? catalog[0]?.key ?? null
      const created = await createRuleSet(orgId, selectedId, {
        name: 'New Rule Set',
        subjectModel,
        rootCondition: { connector: 'AND', conditions: [] },
        actions: [],
      })
      await reload()
      setEditingId(created.id)
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (rowId: number) => {
    setBusy(true)
    try {
      await deleteRuleSet(orgId, rowId)
      if (editingId === rowId) setEditingId(null)
      await reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>{editing ? `Edit · ${editing.name}` : 'Rules Engine'}</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          {loading && <MutedText>Loading…</MutedText>}
          {error && <ErrorText>{error}</ErrorText>}

          {!editing && (
            <>
              <Banner>
                <strong>How rules work.</strong> Each rule runs on one record of a <em>subject</em> you
                choose (a Submission, Policy, Quote…). <strong>When</strong> its conditions match,
                <strong> then</strong> its actions run — update a field, run a calculation, or create /
                update / delete related records. Everything is scoped to your organization.
              </Banner>
              <Toolbar>
                <DefinitionPicker definitions={definitions} selectedId={selectedId} onSelect={select} />
                <Button variant="primary" disabled={busy || !selectedId} onClick={onNew}>+ New Rule</Button>
              </Toolbar>
              <Registry ruleSets={ruleSets} catalog={catalog} busy={busy} onEdit={setEditingId} onDelete={onDelete} />
            </>
          )}

          {editing && (
            <Editor
              key={editing.id}
              orgId={orgId}
              catalog={catalog}
              ruleSet={editing}
              onClose={() => setEditingId(null)}
              onSaved={reload}
            />
          )}
        </S.Section>
      </S.LeftColumn>
    </S.ContentArea>
  )
}

function Registry({
  ruleSets,
  catalog,
  busy,
  onEdit,
  onDelete,
}: {
  ruleSets: RuleSet[]
  catalog: CatalogModel[]
  busy: boolean
  onEdit: (id: number) => void
  onDelete: (id: number) => void
}) {
  const columns: DataTableColumn<RuleSet>[] = [
    { key: 'name', header: 'Name', render: (r) => r.name },
    { key: 'subject', header: 'Runs on', render: (r) => modelLabel(catalog, r.subjectModel) },
    { key: 'summary', header: 'Then', render: (r) => actionsSummary(r.actions) },
    { key: 'enabled', header: 'Enabled', render: (r) => (r.enabled ? '✓' : '—') },
  ]
  return (
    <DataTable<RuleSet>
      columns={columns}
      data={ruleSets}
      emptyText="No rules yet — click “+ New Rule” to create one."
      rowActions={(r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant="ghost" onClick={() => onEdit(r.id)}>Edit</Button>
          <Button variant="ghost" disabled={busy} onClick={() => onDelete(r.id)}>Delete</Button>
        </div>
      )}
    />
  )
}

function modelLabel(catalog: CatalogModel[], key: string | null): string {
  if (!key) return '—'
  return catalog.find((m) => m.key === key)?.model ?? key
}

function actionsSummary(actions: RuleAction[] | null): string {
  if (!actions || actions.length === 0) return '—'
  const counts = actions.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1
    return acc
  }, {})
  return Object.entries(counts).map(([t, n]) => (n > 1 ? `${n}× ${t}` : t)).join(', ')
}

// ─── editor ──────────────────────────────────────────────────────────────────

function Editor({
  orgId,
  catalog,
  ruleSet,
  onClose,
  onSaved,
}: {
  orgId: number
  catalog: CatalogModel[]
  ruleSet: RuleSet
  onClose: () => void
  onSaved: () => Promise<void> | void
}) {
  const [name, setName] = useState<string>(ruleSet.name)
  const [description, setDescription] = useState<string>(ruleSet.description ?? '')
  const [enabled, setEnabled] = useState<boolean>(ruleSet.enabled)
  const [subjectModel, setSubjectModel] = useState<string>(ruleSet.subjectModel ?? catalog[0]?.key ?? '')
  const [rootCondition, setRootCondition] = useState<RuleConditionNode>(
    ruleSet.rootCondition ?? { connector: 'AND', conditions: [] },
  )
  const [actions, setActions] = useState<RuleAction[]>(ruleSet.actions ?? [])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const subjectFields = useMemo(() => fieldsFor(catalog, subjectModel), [catalog, subjectModel])

  const onSave = async () => {
    setSaving(true)
    setErr(null)
    try {
      const input: RuleSetInput = { name, description: description || null, enabled, subjectModel, rootCondition, actions }
      await updateRuleSet(orgId, ruleSet.id, input)
      await onSaved()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <EditorHead>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Button variant="ghost" onClick={onClose}>← Back</Button>
          <div style={{ minWidth: 0 }}>
            <Crumb>Rules engine</Crumb>
            <EditorTitle>{name || 'Untitled rule'}</EditorTitle>
          </div>
        </div>
        <HeaderActions>
          <ToggleSwitch checked={enabled} onChange={setEnabled} label={enabled ? 'Enabled' : 'Disabled'} />
          <Button variant="primary" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save rule'}</Button>
        </HeaderActions>
      </EditorHead>

      {err && <ErrorText>{err}</ErrorText>}

      <CardStack>
        {/* Live plain-English summary, pinned at the top */}
        <Card variant="surface" tone="info">
          <FieldLabel>In plain English</FieldLabel>
          <div style={{ marginTop: 4, lineHeight: 1.6 }}>{ruleToEnglish(catalog, subjectModel, rootCondition, actions)}</div>
        </Card>

        {/* Rule details */}
        <Card variant="surface">
          <CardGrid>
            <FormField label="Name" value={name} onChange={(e: any) => setName(e.target.value)} />
            <Field label="Description">
              <Textarea rows={2} value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="What this rule is for…" />
            </Field>
            <Field label="Subject — what record this rule runs on">
              <SearchableSelect
                ariaLabel="Subject model"
                options={modelOptions(catalog)}
                value={subjectModel}
                onChange={setSubjectModel}
                placeholder={catalog.length === 0 ? 'Loading models…' : 'Select model…'}
                searchPlaceholder="Search models…"
              />
              <HelperText>Conditions and field actions below reference this record and its related data.</HelperText>
            </Field>
          </CardGrid>
        </Card>

        {/* WHEN */}
        <Card variant="surface">
          <StepRow>
            <StepNum>1</StepNum>
            <StepTitle>When</StepTitle>
            <HelperText>conditions that must match</HelperText>
          </StepRow>
          <HelperText>Leave empty to run for every {modelLabel(catalog, subjectModel)}.</HelperText>
          <ConditionEditor fields={subjectFields} node={rootCondition} onChange={setRootCondition} />
        </Card>

        {/* THEN */}
        <Card variant="surface">
          <StepRow>
            <StepNum>2</StepNum>
            <StepTitle>Then</StepTitle>
            <HelperText>what happens when it matches</HelperText>
          </StepRow>
          <ActionsEditor catalog={catalog} subjectModel={subjectModel} actions={actions} onChange={setActions} />
        </Card>

        {/* TEST / RUN */}
        <Card variant="surface">
          <StepRow>
            <Badge variant="neutral">Test &amp; run</Badge>
          </StepRow>
          <TestPanel orgId={orgId} ruleSet={ruleSet} subjectLabel={modelLabel(catalog, subjectModel)} onAfterLiveRun={onSaved} />
        </Card>
      </CardStack>
    </>
  )
}

// ─── conditions (WHEN) ─────────────────────────────────────────────────────--

function ConditionEditor({
  fields,
  node,
  onChange,
}: {
  fields: CatalogField[]
  node: RuleConditionNode
  onChange: (updated: RuleConditionNode) => void
}) {
  if (isGroup(node)) {
    const children = node.conditions ?? []
    const replaceChild = (index: number, updated: RuleConditionNode) => {
      const next = children.slice()
      next[index] = updated
      onChange({ ...node, conditions: next })
    }
    const removeChild = (index: number) => {
      const next = children.slice()
      next.splice(index, 1)
      onChange({ ...node, conditions: next })
    }
    const addCondition = () => onChange({ ...node, conditions: [...children, { field: '', operator: 'equals', value: '' }] })
    const addGroup = () => onChange({ ...node, conditions: [...children, { connector: 'AND', conditions: [] }] })

    return (
      <div style={{ marginLeft: 16, borderLeft: '2px solid var(--xds-outline-variant)', paddingLeft: 12, marginTop: 8 }}>
        <div style={{ marginBottom: 10 }}>
          <FieldLabel>Match</FieldLabel>
          <div style={{ marginTop: 4, maxWidth: 320 }}>
            <SegmentedSwitch
              aria-label="Match"
              options={CONNECTOR_OPTIONS}
              value={node.connector ?? 'AND'}
              onChange={(v: string) => onChange({ ...node, connector: v as RuleConditionNode['connector'] })}
            />
          </div>
        </div>

        {children.length === 0 && <MutedText style={{ marginBottom: 8 }}>No conditions — add one below.</MutedText>}
        {children.map((child, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <ConditionEditor fields={fields} node={child} onChange={(u) => replaceChild(index, u)} />
            </div>
            <Button variant="ghost" onClick={() => removeChild(index)}>Remove</Button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button variant="outline" onClick={addCondition}>+ Add condition</Button>
          <Button variant="outline" onClick={addGroup}>+ Add group</Button>
        </div>
      </div>
    )
  }

  // leaf: field / operator / value
  const operator = node.operator ?? 'equals'
  const showValue = !NO_VALUE_OPERATORS.includes(operator)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1.3fr) minmax(0, 1.4fr)',
        gap: 8,
        alignItems: 'end',
        marginTop: 8,
      }}
    >
      <div>
        <FieldLabel>Field</FieldLabel>
        <FieldSelect fields={fields} value={node.field ?? ''} onChange={(field) => onChange({ ...node, field })} />
      </div>
      <div>
        <FieldLabel>Is</FieldLabel>
        <SearchableSelect
          ariaLabel="Operator"
          options={OPERATOR_OPTIONS}
          value={operator}
          onChange={(v) => onChange({ ...node, operator: v, value: NO_VALUE_OPERATORS.includes(v) ? undefined : node.value })}
          searchPlaceholder="Search operators…"
        />
      </div>
      {showValue && (
        <div>
          <FieldLabel>Value</FieldLabel>
          <AdaptiveValue
            operator={operator}
            kind={fieldKind(fields, node.field ?? '')}
            value={node.value}
            onChange={(value) => onChange({ ...node, value })}
          />
        </div>
      )}
    </div>
  )
}

/** Single dropdown of dot-notation paths within a model (+ legacy "custom" fallback). */
function FieldSelect({
  fields,
  value,
  onChange,
  placeholder,
}: {
  fields: CatalogField[]
  value: string
  onChange: (path: string) => void
  placeholder?: string
}) {
  if (fields.length === 0) {
    return <Input value={value} onChange={(e: any) => onChange(e.target.value)} placeholder="field path" />
  }
  const options = fields.map((f) => ({ value: f.path, label: `${stripPrefix(f.path)} · ${f.kind}` }))
  return (
    <SearchableSelect
      ariaLabel="Field"
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? 'Select field…'}
      searchPlaceholder="Search fields…"
    />
  )
}

/** Value input that adapts to the operator and field kind. */
function AdaptiveValue({
  operator,
  kind,
  value,
  onChange,
}: {
  operator: string
  kind: CatalogField['kind'] | null
  value: unknown
  onChange: (value: unknown) => void
}) {
  const str = value == null ? '' : String(value)
  if (LIST_OPERATORS.includes(operator)) {
    return <Input value={str} placeholder="comma, separated, list" onChange={(e: any) => onChange(e.target.value)} />
  }
  if (kind === 'boolean') {
    return (
      <Select value={str} onChange={(e: any) => onChange(e.target.value)}>
        <option value="">—</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </Select>
    )
  }
  const numeric = kind === 'number' || NUMERIC_OPERATORS.includes(operator)
  if (numeric) {
    return <NumberInput value={str} onChange={(e: any) => onChange(e.target.value)} />
  }
  return <Input value={str} onChange={(e: any) => onChange(e.target.value)} />
}

// ─── actions (THEN) ────────────────────────────────────────────────────────--

function ActionsEditor({
  catalog,
  subjectModel,
  actions,
  onChange,
}: {
  catalog: CatalogModel[]
  subjectModel: string
  actions: RuleAction[]
  onChange: (next: RuleAction[]) => void
}) {
  const update = (i: number, patch: Partial<RuleAction>) => {
    const next = actions.slice()
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }
  const remove = (i: number) => {
    const next = actions.slice()
    next.splice(i, 1)
    onChange(next)
  }
  const add = () => onChange([...actions, resetActionForType('modify')])

  return (
    <div>
      {actions.length === 0 && <MutedText style={{ marginBottom: 10 }}>No actions yet — add what should happen when the rule matches.</MutedText>}
      {actions.map((action, i) => {
        const needsTarget = action.type !== 'modify'
        return (
          <Card key={i} variant="low" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 190 }}>
                <SearchableSelect
                  ariaLabel="Action"
                  options={ACTION_OPTIONS}
                  value={action.type}
                  onChange={(v) => update(i, resetActionForType(v as RuleActionType))}
                  searchPlaceholder="Search actions…"
                />
              </div>
              {needsTarget && (
                <>
                  <MutedText>in</MutedText>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <SearchableSelect
                      ariaLabel="Target model"
                      options={modelOptions(catalog)}
                      value={action.targetModel ?? ''}
                      onChange={(v) => update(i, { targetModel: v })}
                      placeholder="Select model…"
                      searchPlaceholder="Search models…"
                    />
                  </div>
                </>
              )}
              <div style={{ marginLeft: 'auto' }}>
                <Button variant="ghost" onClick={() => remove(i)}>Remove</Button>
              </div>
            </div>
            <ActionBody catalog={catalog} subjectModel={subjectModel} action={action} onChange={(patch) => update(i, patch)} />
          </Card>
        )
      })}
      <Button variant="outline" onClick={add}>+ Add action</Button>
    </div>
  )
}

function resetActionForType(type: RuleActionType): RuleAction {
  switch (type) {
    case 'modify': return { type, assignments: [] }
    case 'create': return { type, targetModel: '', assignments: [] }
    case 'update': return { type, targetModel: '', match: { connector: 'AND', conditions: [] }, assignments: [] }
    case 'delete': return { type, targetModel: '', match: { connector: 'AND', conditions: [] } }
    default: return { type: 'modify', assignments: [] }
  }
}

function ActionBody({
  catalog,
  subjectModel,
  action,
  onChange,
}: {
  catalog: CatalogModel[]
  subjectModel: string
  action: RuleAction
  onChange: (patch: Partial<RuleAction>) => void
}) {
  const subjectOwn = ownFields(catalog, subjectModel)

  switch (action.type) {
    case 'modify':
      return (
        <div style={{ marginTop: 10 }}>
          <HelperText>Sets fields on this {modelLabel(catalog, subjectModel)} record. A value can be typed or computed as a formula.</HelperText>
          <AssignmentsEditor fields={subjectOwn} assignments={action.assignments ?? []} onChange={(assignments) => onChange({ assignments })} />
        </div>
      )

    case 'create':
    case 'update':
    case 'delete': {
      const targetOwn = ownFields(catalog, action.targetModel)
      const targetFields = fieldsFor(catalog, action.targetModel)
      return (
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          {(action.type === 'update' || action.type === 'delete') && (
            <div>
              <FieldLabel>Which {modelLabel(catalog, action.targetModel ?? null)} records</FieldLabel>
              <HelperText>A selector is required — {action.type} never affects every row.</HelperText>
              <ConditionEditor
                fields={targetFields}
                node={action.match ?? { connector: 'AND', conditions: [] }}
                onChange={(match) => onChange({ match })}
              />
            </div>
          )}

          {(action.type === 'create' || action.type === 'update') && (
            <AssignmentsEditor fields={targetOwn} assignments={action.assignments ?? []} onChange={(assignments) => onChange({ assignments })} />
          )}
        </div>
      )
    }

    default:
      return null
  }
}

function AssignmentsEditor({
  fields,
  assignments,
  onChange,
}: {
  fields: CatalogField[]
  assignments: RuleAssignment[]
  onChange: (next: RuleAssignment[]) => void
}) {
  const update = (i: number, patch: Partial<RuleAssignment>) => {
    const next = assignments.slice()
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }
  const remove = (i: number) => {
    const next = assignments.slice()
    next.splice(i, 1)
    onChange(next)
  }
  const add = () => onChange([...assignments, { path: '', source: { mode: 'literal', value: '' } }])

  return (
    <div>
      <FieldLabel>Field values</FieldLabel>
      {assignments.length === 0 && <MutedText style={{ marginTop: 4, marginBottom: 6 }}>No field values set.</MutedText>}
      <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
        {assignments.map((a, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.3fr) auto minmax(0, 1.8fr) auto',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <FieldSelect fields={fields} value={a.path} onChange={(p) => update(i, { path: p })} />
            <span style={{ textAlign: 'center', color: 'var(--xds-on-surface-variant)' }}>=</span>
            <ValueSourceEditor source={a.source} onChange={(source) => update(i, { source })} />
            <Button variant="ghost" onClick={() => remove(i)}>×</Button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <Button variant="outline" onClick={add}>+ Add field value</Button>
      </div>
    </div>
  )
}

/** Literal value or arithmetic expression over the subject's fields. */
function ValueSourceEditor({
  source,
  forceExpression,
  onChange,
}: {
  source: ValueSource | undefined
  forceExpression?: boolean
  onChange: (source: ValueSource) => void
}) {
  const mode = forceExpression ? 'expression' : source?.mode ?? 'literal'
  const text = source?.mode === 'expression' ? source.expression : source?.mode === 'literal' ? String(source.value ?? '') : ''
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {!forceExpression && (
        <div style={{ flex: '0 0 auto' }}>
          <SegmentedSwitch
            aria-label="Value source"
            options={VALUE_SOURCE_OPTIONS}
            value={mode}
            onChange={(m: string) => onChange(m === 'expression' ? { mode: 'expression', expression: text } : { mode: 'literal', value: text })}
          />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Input
          value={text}
          placeholder={mode === 'expression' ? 'e.g. limit * 0.1' : 'value'}
          onChange={(e: any) =>
            onChange(mode === 'expression' ? { mode: 'expression', expression: e.target.value } : { mode: 'literal', value: e.target.value })
          }
        />
      </div>
    </div>
  )
}

const VALUE_SOURCE_OPTIONS = [
  { value: 'literal', label: 'Value' },
  { value: 'expression', label: 'Formula' },
]

// ─── plain-English preview ─────────────────────────────────────────────────--

function ruleToEnglish(catalog: CatalogModel[], subjectModel: string, root: RuleConditionNode, actions: RuleAction[]): string {
  const subject = modelLabel(catalog, subjectModel)
  const cond = describeCondition(root)
  const when = cond ? `When a ${subject} where ${cond}` : `For every ${subject}`
  const then = actions.length ? actions.map(describeAction).join('; ') : 'do nothing yet'
  return `${when}, then ${then}.`
}

function describeCondition(node: RuleConditionNode | undefined): string {
  if (!node) return ''
  if (isGroup(node)) {
    const parts = (node.conditions ?? []).map(describeCondition).filter(Boolean)
    if (parts.length === 0) return ''
    const connector = node.connector ?? 'AND'
    if (connector === 'NOT') return `not (${parts.join(' and ')})`
    return parts.join(connector === 'OR' ? ' or ' : ' and ')
  }
  if (!node.field) return ''
  const op = humanizeKey(String(node.operator ?? ''))
  const val = NO_VALUE_OPERATORS.includes(String(node.operator)) ? '' : ` ${String(node.value ?? '')}`
  return `${stripPrefix(node.field)} ${op}${val}`.trim()
}

function describeAction(action: RuleAction): string {
  const val = (s?: ValueSource) => (s?.mode === 'expression' ? s.expression : String(s?.value ?? ''))
  const sets = (action.assignments ?? []).filter((a) => a.path).map((a) => `${stripPrefix(a.path)} = ${val(a.source)}`).join(', ')
  switch (action.type) {
    case 'modify': return `update this record (${sets || 'no fields'})`
    case 'create': return `create a ${action.targetModel || 'record'}${sets ? ` with ${sets}` : ''}`
    case 'update': return `update matching ${action.targetModel || 'records'}${sets ? `, set ${sets}` : ''}`
    case 'delete': return `delete matching ${action.targetModel || 'records'}`
    default: return action.type
  }
}

// ─── test & run ────────────────────────────────────────────────────────────--

function TestPanel({
  orgId,
  ruleSet,
  subjectLabel,
  onAfterLiveRun,
}: {
  orgId: number
  ruleSet: RuleSet
  subjectLabel: string
  onAfterLiveRun: () => Promise<void> | void
}) {
  const [subjectId, setSubjectId] = useState<string>('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RuleRunResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = async (dryRun: boolean) => {
    const id = Number(subjectId)
    if (!Number.isFinite(id)) {
      setErr('Enter a numeric record id to test against.')
      return
    }
    if (!dryRun && !window.confirm('Run live? This commits create/update/delete and writes calculated values to real records.')) return
    setRunning(true)
    setErr(null)
    try {
      const res = await runRuleSet(orgId, ruleSet.id, id, dryRun)
      setResult(res)
      if (!dryRun) await onAfterLiveRun()
    } catch (e: any) {
      setErr(e?.message ?? 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <HelperText>Runs against the last <strong>saved</strong> version of this rule. Dry-run previews changes; Run live commits them.</HelperText>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 6 }}>
        <div>
          <FieldLabel>{subjectLabel} record id</FieldLabel>
          <NumberInput value={subjectId} onChange={(e: any) => setSubjectId(e.target.value)} />
        </div>
        <Button variant="outline" disabled={running} onClick={() => run(true)}>{running ? 'Running…' : 'Dry run'}</Button>
        <Button variant="primary" disabled={running} onClick={() => run(false)}>Run live</Button>
      </div>

      {err && <ErrorText style={{ marginTop: 8 }}>{err}</ErrorText>}
      {result && <RunResult result={result} />}
    </div>
  )
}

function RunResult({ result }: { result: RuleRunResult }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ marginBottom: 6 }}>
        <strong>{result.dryRun ? 'Dry run' : 'Live run'}</strong>{' · '}
        {!result.subjectFound ? 'subject not found' : result.matched ? 'conditions matched ✓' : 'conditions did not match'}
      </div>
      {result.actions.length > 0 && (
        <Pre>
          {result.actions
            .map((a) => `[${a.status}] ${a.type}: ${a.detail}${a.before !== undefined ? `  (${fmt(a.before)} → ${fmt(a.after)})` : ''}`)
            .join('\n')}
        </Pre>
      )}
      {result.warnings.length > 0 && <MutedText style={{ marginTop: 6 }}>{result.warnings.join(' ')}</MutedText>}
    </div>
  )
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
