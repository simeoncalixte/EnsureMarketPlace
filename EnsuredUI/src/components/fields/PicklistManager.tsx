import React, { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import Drawer from '../../xds/components/Drawer'
import Button from '../../xds/components/Button'
import Input from '../../xds/components/Input'
import Badge from '../../xds/components/Badge'
import SegmentedSwitch from '../../xds/components/SegmentedSwitch'
import { colors } from '../../xds/colors'
import type { FieldSource } from './fieldSource'
import {
  resolveOptionSet,
  addOptionItem,
  removeOptionItem,
  listEntityOptions,
  type ResolvedItem,
} from '../../api/fieldOptions'
import {
  createDepartment,
  deleteDepartment,
  createTeam,
  deleteTeam,
  createPartner,
  deletePartner,
  type PartnerKind,
} from '../../api/orgStructure'

const Body = styled.div`
  display: grid;
  gap: 10px;
`
const Hint = styled.div`
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
`
const Err = styled.div`
  font-size: 12px;
  color: ${colors.error};
`
const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid ${colors.outlineVariant};
  border-radius: 8px;
`
const RowLabel = styled.span<{ $muted?: boolean }>`
  flex: 1 1 auto;
  font-size: 14px;
  color: ${(p) => (p.$muted ? colors.onSurfaceVariant : colors.onSurface)};
  text-decoration: ${(p) => (p.$muted ? 'line-through' : 'none')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
const AddRow = styled.form`
  display: flex;
  gap: 8px;
  margin-top: 4px;
`
const PartnerAdd = styled.form`
  display: grid;
  gap: 8px;
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid ${colors.outlineVariant};
`

type EntityRow = { value: number; label: string }

export type PicklistManagerProps = {
  organizationId: number
  source: FieldSource
  /** Parent value for a dependent entity (e.g. the department id for teams). */
  dependsOnValue?: number | null
  open: boolean
  onClose: () => void
  /** Notify the host select to reload its options after a change. */
  onChanged: () => void
}

/**
 * Self-service add/remove for a field's options. Works for both source kinds:
 *  - optionSet → add a tenant item, hide/restore a global default, remove a tenant item
 *  - entity (department/team) → create/delete the underlying org rows
 * Users are not manageable here (they're real accounts, not a picklist).
 */
export const PicklistManager: React.FC<PicklistManagerProps> = ({
  organizationId,
  source,
  dependsOnValue,
  open,
  onClose,
  onChanged,
}) => {
  const [optionItems, setOptionItems] = useState<ResolvedItem[]>([])
  const [entityItems, setEntityItems] = useState<EntityRow[]>([])
  const [partnerItems, setPartnerItems] = useState<Array<{ value: string; label: string }>>([])
  const [newLabel, setNewLabel] = useState('')
  const [partnerKind, setPartnerKind] = useState<PartnerKind>('organization')
  const [partnerName, setPartnerName] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOptionSet = source.kind === 'optionSet'
  const isTeam = source.kind === 'entity' && source.entity === 'team'
  const isPartner = source.kind === 'entity' && source.entity === 'partner'
  const teamBlocked = isTeam && (dependsOnValue == null)

  const load = useCallback(async () => {
    if (!open) return
    setError(null)
    try {
      if (source.kind === 'optionSet') {
        const res = await resolveOptionSet(organizationId, source.key)
        setOptionItems(res.allItems)
      } else if (source.kind === 'entity' && source.entity === 'partner') {
        const res = await listEntityOptions(organizationId, 'partner')
        setPartnerItems(res.items.map((i) => ({ value: String(i.value), label: i.label })))
      } else if (source.kind === 'entity') {
        if (source.entity === 'user') return
        if (source.entity === 'team' && dependsOnValue == null) {
          setEntityItems([])
          return
        }
        const res = await listEntityOptions(organizationId, source.entity, {
          departmentId: source.entity === 'team' ? (dependsOnValue ?? undefined) : undefined,
        })
        // department/team values are numeric ids.
        setEntityItems(res.items.map((i) => ({ value: Number(i.value), label: i.label })))
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load options')
    }
  }, [open, organizationId, source, dependsOnValue])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await load()
      onChanged()
    } catch (e: any) {
      setError(e?.message ?? 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const label = newLabel.trim()
    if (!label) return
    void run(async () => {
      if (source.kind === 'optionSet') {
        await addOptionItem(organizationId, source.key, label)
      } else if (source.kind === 'entity' && source.entity === 'department') {
        await createDepartment(organizationId, label)
      } else if (source.kind === 'entity' && source.entity === 'team' && dependsOnValue != null) {
        await createTeam(organizationId, dependsOnValue, label)
      }
      setNewLabel('')
    })
  }

  const onAddPartner = (e: React.FormEvent) => {
    e.preventDefault()
    const name = partnerName.trim()
    if (!name) return
    void run(async () => {
      await createPartner(organizationId, {
        kind: partnerKind,
        name,
        email: partnerKind === 'user' && partnerEmail.trim() ? partnerEmail.trim() : undefined,
      })
      setPartnerName('')
      setPartnerEmail('')
    })
  }

  const title = isOptionSet ? 'Manage options' : isPartner ? 'Manage partners' : `Manage ${(source as any).entity}s`

  return (
    <Drawer open={open} title={title} subtitle="Add or remove options for this field" onClose={onClose} width="380px">
      <Body>
        {error && <Err>{error}</Err>}

        {/* Option-set items: tenant items are removable; globals can be hidden/restored. */}
        {isOptionSet &&
          optionItems.map((it) => (
            <Row key={`${it.scope}-${it.value}`}>
              <RowLabel $muted={it.hidden} title={it.value}>
                {it.label}
              </RowLabel>
              <Badge variant={it.scope === 'tenant' ? 'info' : 'neutral'}>
                {it.scope === 'tenant' ? 'Custom' : 'Default'}
              </Badge>
              {it.scope === 'tenant' ? (
                <Button variant="ghost" disabled={busy} onClick={() => run(() => removeOptionItem(organizationId, (source as any).key, it.value))}>
                  Remove
                </Button>
              ) : it.hidden ? (
                <Button variant="ghost" disabled={busy} onClick={() => run(() => addOptionItem(organizationId, (source as any).key, it.label, it.value))}>
                  Restore
                </Button>
              ) : (
                <Button variant="ghost" disabled={busy} onClick={() => run(() => removeOptionItem(organizationId, (source as any).key, it.value))}>
                  Hide
                </Button>
              )}
            </Row>
          ))}

        {/* Entity rows (department/team): delete the underlying org row. */}
        {!isOptionSet && source.kind === 'entity' && source.entity === 'user' && (
          <Hint>Users come from your organization's members and aren't edited here.</Hint>
        )}
        {teamBlocked && <Hint>Select a department first to manage its teams.</Hint>}
        {!isOptionSet &&
          !teamBlocked &&
          source.kind === 'entity' &&
          source.entity !== 'user' &&
          source.entity !== 'partner' &&
          entityItems.map((it) => (
            <Row key={it.value}>
              <RowLabel>{it.label}</RowLabel>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  run(() =>
                    (source as any).entity === 'department'
                      ? deleteDepartment(organizationId, it.value)
                      : deleteTeam(organizationId, it.value),
                  )
                }
              >
                Remove
              </Button>
            </Row>
          ))}

        {/* Partner stubs (org or user) — created with default info, claimable later. */}
        {isPartner && partnerItems.length === 0 && (
          <Hint>No partners yet — add a partner organization or contact below.</Hint>
        )}
        {isPartner &&
          partnerItems.map((it) => (
            <Row key={it.value}>
              <RowLabel title={it.value}>{it.label}</RowLabel>
              <Badge variant={it.value.startsWith('org:') ? 'info' : 'neutral'}>
                {it.value.startsWith('org:') ? 'Org' : 'User'}
              </Badge>
              <Button variant="ghost" disabled={busy} onClick={() => run(() => deletePartner(organizationId, it.value))}>
                Remove
              </Button>
            </Row>
          ))}
        {isPartner && (
          <PartnerAdd onSubmit={onAddPartner}>
            <SegmentedSwitch
              options={[
                { label: 'Organization', value: 'organization' },
                { label: 'User', value: 'user' },
              ]}
              value={partnerKind}
              onChange={(v) => setPartnerKind(v as PartnerKind)}
            />
            <Input
              value={partnerName}
              placeholder={partnerKind === 'organization' ? 'Partner organization name…' : 'Partner full name…'}
              aria-label="Partner name"
              onChange={(e) => setPartnerName(e.target.value)}
            />
            {partnerKind === 'user' && (
              <Input
                value={partnerEmail}
                placeholder="Email (optional)…"
                aria-label="Partner email"
                onChange={(e) => setPartnerEmail(e.target.value)}
              />
            )}
            <Button variant="secondary" type="submit" disabled={busy || !partnerName.trim()}>
              Add partner
            </Button>
          </PartnerAdd>
        )}

        {/* Add row — hidden for user/partner entities and for a team with no parent chosen. */}
        {!(source.kind === 'entity' && (source.entity === 'user' || source.entity === 'partner')) && !teamBlocked && (
          <AddRow onSubmit={onAdd}>
            <Input
              value={newLabel}
              placeholder="Add an option…"
              aria-label="New option label"
              onChange={(e) => setNewLabel(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button variant="secondary" type="submit" disabled={busy || !newLabel.trim()}>
              Add
            </Button>
          </AddRow>
        )}
      </Body>
    </Drawer>
  )
}

export default PicklistManager
