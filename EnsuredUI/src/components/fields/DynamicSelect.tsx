import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Select from '../../xds/components/Select'
import MultiSelect from '../../xds/components/MultiSelect'
import { Wrap, Grow, ManageBtn, Note } from '../../xds/components/DynamicSelectStyles'
import type { FieldSource } from './fieldSource'
import { resolveOptionSet, listEntityOptions } from '../../api/fieldOptions'
import PicklistManager from './PicklistManager'

type Option = { value: string; label: string }

export type DynamicSelectProps = {
  organizationId: number | null
  source: FieldSource
  value: unknown
  onChange: (value: unknown) => void
  /** Multi-select (e.g. an approval committee of users). */
  multiple?: boolean
  /** Resolved value of the field named by `source.dependsOn` (e.g. department id). */
  dependsOnValue?: number | string | null
  includeBlank?: string
  placeholder?: string
  disabled?: boolean
}
// Styled wrappers have been moved to `src/xds/components/DynamicSelectStyles`

const isEntity = (s: FieldSource): s is Extract<FieldSource, { kind: 'entity' }> => s.kind === 'entity'

/**
 * One select for every dynamic dropdown. Resolves its options from a FieldSource
 * (tenant option set, live entity rows, or a fixed enum), coerces values to the
 * right type (entity ids are numbers; option/enum values are strings), supports
 * multi-select, and — when the source is manageable — exposes add/remove via the
 * PicklistManager.
 */
export const DynamicSelect: React.FC<DynamicSelectProps> = ({
  organizationId,
  source,
  value,
  onChange,
  multiple = false,
  dependsOnValue,
  includeBlank = '—',
  placeholder,
  disabled,
}) => {
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [managing, setManaging] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const entityKind = isEntity(source) ? source.entity : null
  // Most entity values are numeric ids, but some are string-keyed and must NOT be
  // coerced to Number: partner values are `org:<id>`/`user:<id>` strings, and
  // peril values are taxonomy codes (e.g. "FIRE"). Coercing those to Number yields
  // NaN, which collapses a multi-select to a single broken entry.
  const STRING_ENTITIES = new Set(['partner', 'peril'])
  const numericEntity = entityKind != null && !STRING_ENTITIES.has(entityKind)
  const dependsNum =
    dependsOnValue == null || dependsOnValue === '' ? null : Number(dependsOnValue)

  const manageable =
    organizationId != null &&
    ((source.kind === 'optionSet' && source.manageable) ||
      (isEntity(source) && source.manageable === true && source.entity !== 'user'))

  const load = useCallback(async () => {
    if (source.kind === 'enum') {
      setOptions(source.values)
      return
    }
    if (organizationId == null) {
      setOptions([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (source.kind === 'optionSet') {
        const res = await resolveOptionSet(organizationId, source.key)
        setOptions(res.items.map((i) => ({ value: i.value, label: i.label })))
      } else {
        const res = await listEntityOptions(organizationId, source.entity, {
          departmentId: source.entity === 'team' ? dependsNum : undefined,
        })
        setOptions(res.items.map((i) => ({ value: String(i.value), label: i.label })))
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load options')
      setOptions([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, source.kind, (source as any).key, entityKind, dependsNum, reloadKey])

  useEffect(() => {
    void load()
  }, [load])

  // Coerce a chosen raw string back to the field's stored type.
  const coerceOne = (raw: string): unknown => {
    if (raw === '') return entityKind ? null : ''
    return numericEntity ? Number(raw) : raw
  }

  const selectedValues = useMemo<string[]>(
    () => (Array.isArray(value) ? value.map((v) => String(v)) : []),
    [value],
  )

  const onToggle = (v: string) => {
    const next = new Set(selectedValues)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    const arr = Array.from(next)
    onChange(numericEntity ? arr.map((x) => Number(x)) : arr)
  }

  const emptyNote =
    !loading && !error && options.length === 0
      ? source.kind === 'entity' && source.entity === 'user'
        ? 'No users in your organization yet.'
        : manageable
          ? 'No options yet — use Manage to add one.'
          : 'No options configured.'
      : null

  const control = multiple ? (
    <MultiSelect
      label={placeholder ?? 'Select'}
      options={options}
      selected={selectedValues}
      onToggle={onToggle}
      isLoading={loading}
      error={error}
      placeholder={placeholder ?? 'Select…'}
      emptyText={emptyNote ?? 'No options available.'}
      disabled={disabled}
    />
  ) : (
    <Select
      value={value == null ? '' : String(value)}
      disabled={disabled || loading}
      onChange={(e) => onChange(coerceOne(e.target.value))}
    >
      <option value="">{loading ? 'Loading…' : includeBlank}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  )

  return (
    <>
      <Wrap>
        <Grow>{control}</Grow>
        {manageable && (
          <ManageBtn type="button" disabled={disabled} onClick={() => setManaging(true)}>
            Manage
          </ManageBtn>
        )}
      </Wrap>
      {error ? <Note>{error}</Note> : emptyNote && !multiple ? <Note>{emptyNote}</Note> : null}
      {manageable && organizationId != null && (
        <PicklistManager
          organizationId={organizationId}
          source={source}
          dependsOnValue={dependsNum}
          open={managing}
          onClose={() => setManaging(false)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
    </>
  )
}

export default DynamicSelect
