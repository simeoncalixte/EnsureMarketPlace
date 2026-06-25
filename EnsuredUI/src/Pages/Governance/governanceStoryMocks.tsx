import React from 'react'
import type { Decorator } from '@storybook/react'

/**
 * Storybook harness for the Governance pages.
 *
 * The pages talk to `/api/organizations/:id/governance/*` through the shared
 * api client, which resolves `window.fetch` at call time (see lib/auth.ts) so a
 * story can swap it. This module installs a STATEFUL in-memory mock: GET reads
 * the store, POST/PUT/DELETE/transition/clone mutate it, so `play` interaction
 * tests confirm real behaviour (add a row → it appears; run a sim → it lands in
 * the list). It also seeds a fake JWT so `useAuthMe` yields organizationId 1.
 */

const ORG_ID = 1

type AnyRow = Record<string, any>

interface Store {
  seq: number
  definitions: AnyRow[]
  authorityLevels: AnyRow[]
  referralRules: AnyRow[]
  ruleSets: AnyRow[]
  simulations: AnyRow[]
  audit: AnyRow[]
}

const FIXED_TS = '2026-06-20T12:00:00.000Z'

function blankDefinition(overrides: AnyRow): AnyRow {
  return {
    id: 0,
    organizationId: ORG_ID,
    name: 'Untitled Capacity',
    code: null,
    description: null,
    status: 'draft',
    effectiveDate: null,
    expirationDate: null,
    versionNumber: '1.0.0',
    deploymentStatus: 'draft',
    isActive: false,
    lineOfBusiness: null,
    department: null,
    team: null,
    ownerUserId: null,
    backupOwnerUserId: null,
    riskManagerUserId: null,
    approvalCommittee: [],
    geographicControls: {},
    riskEligibility: {},
    exposureConstraints: {},
    portfolioControls: {},
    accumulationControls: {},
    pricingControls: {},
    coverageControls: {},
    distributionControls: {},
    riskScoring: {},
    workflowConfig: {},
    createdByUserId: 1,
    lastModifiedByUserId: 1,
    approvedByUserId: null,
    approvalDate: null,
    changeReason: null,
    createdAt: FIXED_TS,
    updatedAt: FIXED_TS,
    ...overrides,
  }
}

function freshStore(): Store {
  return {
    seq: 100,
    definitions: [
      blankDefinition({
        id: 1,
        name: 'Primary Capacity',
        code: 'PRIMARY',
        status: 'active',
        deploymentStatus: 'active',
        isActive: true,
        pricingControls: { minimumPrice: 1000, targetProfitability: 12 },
      }),
      blankDefinition({ id: 2, name: 'Specialty Cyber Pilot', code: 'CYBER-PILOT', status: 'draft' }),
    ],
    authorityLevels: [
      { id: 10, capacityDefinitionId: 1, organizationId: ORG_ID, name: 'Underwriter L1', maxPremiumAuthority: '500000', maxExposureAuthority: '5000000', maxPricingDeviation: '5', maxDiscountAuthority: '10', maxCreditAuthority: '5', referralThreshold: '1000000', sortOrder: 100 },
    ],
    referralRules: [
      { id: 20, capacityDefinitionId: 1, organizationId: ORG_ID, name: 'Large line referral', description: 'Refer lines above threshold', severity: 'high', triggerConditions: { connector: 'AND', conditions: [] }, referralDestinationType: 'group', referralDestinationId: 'senior-uw', activeFlag: true, sortOrder: 100 },
    ],
    ruleSets: [
      { id: 30, capacityDefinitionId: 1, organizationId: ORG_ID, name: 'Coastal wind guard', description: null, rootCondition: { connector: 'AND', conditions: [{ field: 'peril', operator: 'equals', value: 'wind' }] }, outcome: 'refer', enabled: true, sortOrder: 100 },
    ],
    simulations: [],
    audit: [
      { id: 40, capacityDefinitionId: 1, organizationId: ORG_ID, action: 'created', versionNumber: '1.0.0', changeReason: null, snapshot: { name: 'Primary Capacity', status: 'active', versionNumber: '1.0.0' }, changedByUserId: 1, createdAt: FIXED_TS },
    ],
  }
}

const OPTION_SETS: Record<string, Array<{ value: string; label: string }>> = {
  'governance.capacity.status': [['draft', 'Draft'], ['pending_approval', 'Pending Approval'], ['active', 'Active'], ['suspended', 'Suspended'], ['retired', 'Retired']].map(([value, label]) => ({ value, label })),
  'governance.deployment.status': [['draft', 'Draft'], ['testing', 'Testing'], ['approval_pending', 'Approval Pending'], ['approved', 'Approved'], ['scheduled', 'Scheduled'], ['active', 'Active'], ['retired', 'Retired']].map(([value, label]) => ({ value, label })),
  'governance.referral.severity': [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['critical', 'Critical']].map(([value, label]) => ({ value, label })),
  'governance.exposure.limitKind': [['hard_limit', 'Hard Limit'], ['soft_limit', 'Soft Limit'], ['referral_threshold', 'Referral Threshold']].map(([value, label]) => ({ value, label })),
  'governance.accumulation.method': [['geographic', 'Geographic'], ['organizational', 'Organizational'], ['industry', 'Industry'], ['custom', 'Custom']].map(([value, label]) => ({ value, label })),
  'governance.rules.operator': [['equals', 'Equals'], ['not_equals', 'Does Not Equal'], ['greater_than', 'Greater Than'], ['less_than', 'Less Than'], ['in_list', 'In List'], ['within_radius', 'Within Radius']].map(([value, label]) => ({ value, label })),
  'governance.rules.connector': [['AND', 'AND'], ['OR', 'OR'], ['NOT', 'NOT']].map(([value, label]) => ({ value, label })),
  'governance.scoring.model': [['internal_heuristic', 'Internal Heuristic'], ['weighted_composite', 'Weighted Composite'], ['external_model', 'External Model']].map(([value, label]) => ({ value, label })),
  'governance.distribution.tier': [['tier_1', 'Tier 1'], ['tier_2', 'Tier 2'], ['tier_3', 'Tier 3']].map(([value, label]) => ({ value, label })),
  'governance.simulation.type': [['rule_testing', 'Rule Testing'], ['capacity_simulation', 'Capacity Simulation'], ['what_if_analysis', 'What-If Analysis'], ['portfolio_impact_analysis', 'Portfolio Impact Analysis']].map(([value, label]) => ({ value, label })),
  'governance.org.lineOfBusiness': [['property', 'Property'], ['general_liability', 'General Liability'], ['specialty', 'Specialty']].map(([value, label]) => ({ value, label })),
  'governance.org.department': [['underwriting', 'Underwriting'], ['portfolio_management', 'Portfolio Management'], ['risk_management', 'Risk Management']].map(([value, label]) => ({ value, label })),
  'governance.org.team': [['property', 'Property'], ['casualty', 'Casualty'], ['cyber', 'Cyber']].map(([value, label]) => ({ value, label })),
}

let store: Store = freshStore()
let originalFetch: typeof window.fetch | null = null

function json(body: unknown, status = 200): Response {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function summarizeSim(type: string, params: AnyRow): AnyRow {
  const exposure = Number(params?.exposure ?? 0) || 0
  const capacity = Number(params?.capacity ?? exposure * 4) || 1
  const pct = exposure > 0 ? Math.min(100, Math.round((exposure / capacity) * 100)) : 0
  return { type, evaluatedAt: FIXED_TS, projectedUtilizationPct: pct, projectedExposure: exposure, withinAppetite: pct <= 100, notes: 'Mock forecast.' }
}

function audit(defId: number, action: string, snap: AnyRow): void {
  store.audit.unshift({ id: ++store.seq, capacityDefinitionId: defId, organizationId: ORG_ID, action, versionNumber: snap.versionNumber ?? null, changeReason: snap.changeReason ?? null, snapshot: snap, changedByUserId: 1, createdAt: FIXED_TS })
}

async function route(method: string, path: string, payload: AnyRow): Promise<Response> {
  const g = `/api/organizations/${ORG_ID}/governance`

  // ── option sets ──
  let m = path.match(new RegExp(`${g}/option-sets/(.+)$`))
  if (m) {
    const key = decodeURIComponent(m[1])
    return json({ optionSetKey: key, label: key, items: OPTION_SETS[key] ?? [] })
  }

  // ── definitions collection ──
  if (path === `${g}/capacity-definitions`) {
    if (method === 'GET') return json(store.definitions)
    if (method === 'POST') {
      const row = blankDefinition({ ...payload, id: ++store.seq })
      store.definitions.push(row)
      audit(row.id, 'created', row)
      return json(row, 201)
    }
  }

  // ── definition lifecycle: transition / clone ──
  m = path.match(new RegExp(`${g}/capacity-definitions/(\\d+)/(transition|clone)$`))
  if (m && method === 'POST') {
    const id = Number(m[1])
    const def = store.definitions.find((d) => d.id === id)
    if (!def) return json({ error: 'not_found' }, 404)
    if (m[2] === 'transition') {
      if (payload.status) def.status = payload.status
      if (payload.deploymentStatus) def.deploymentStatus = payload.deploymentStatus
      const becomingActive = payload.status === 'active' || payload.deploymentStatus === 'active'
      if (becomingActive) {
        store.definitions.forEach((d) => (d.isActive = false))
        def.isActive = true
        def.approvalDate = FIXED_TS
      } else if (payload.status === 'suspended' || payload.status === 'retired') {
        def.isActive = false
      }
      audit(def.id, `transition:${payload.status ?? payload.deploymentStatus}`, def)
      return json(def)
    }
    const clone = blankDefinition({ ...def, id: ++store.seq, name: `${def.name} (copy)`, code: def.code ? `${def.code}-COPY` : null, status: 'draft', deploymentStatus: 'draft', isActive: false, versionNumber: '1.1.0' })
    store.definitions.push(clone)
    audit(clone.id, `cloned_from:${id}`, clone)
    return json(clone, 201)
  }

  // ── single definition ──
  m = path.match(new RegExp(`${g}/capacity-definitions/(\\d+)$`))
  if (m) {
    const id = Number(m[1])
    const idx = store.definitions.findIndex((d) => d.id === id)
    if (idx < 0) return json({ error: 'not_found' }, 404)
    if (method === 'GET') {
      const def = store.definitions[idx]
      return json({
        ...def,
        authorityLevels: store.authorityLevels.filter((r) => r.capacityDefinitionId === id),
        referralRules: store.referralRules.filter((r) => r.capacityDefinitionId === id),
        ruleSets: store.ruleSets.filter((r) => r.capacityDefinitionId === id),
      })
    }
    if (method === 'PUT') {
      store.definitions[idx] = { ...store.definitions[idx], ...payload, updatedAt: FIXED_TS }
      audit(id, 'updated', store.definitions[idx])
      return json(store.definitions[idx])
    }
    if (method === 'DELETE') {
      store.definitions.splice(idx, 1)
      return json(undefined, 204)
    }
  }

  // ── ordered children: authority-levels / referral-rules / rule-sets ──
  const children: Array<{ seg: string; coll: keyof Store }> = [
    { seg: 'authority-levels', coll: 'authorityLevels' },
    { seg: 'referral-rules', coll: 'referralRules' },
    { seg: 'rule-sets', coll: 'ruleSets' },
  ]
  for (const { seg, coll } of children) {
    const list = store[coll] as AnyRow[]
    // collection under a definition
    m = path.match(new RegExp(`${g}/capacity-definitions/(\\d+)/${seg}$`))
    if (m) {
      const defId = Number(m[1])
      if (method === 'GET') return json(list.filter((r) => r.capacityDefinitionId === defId))
      if (method === 'POST') {
        const row = { id: ++store.seq, capacityDefinitionId: defId, organizationId: ORG_ID, sortOrder: 100, ...payload }
        list.push(row)
        return json(row, 201)
      }
    }
    // single child by id
    m = path.match(new RegExp(`${g}/${seg}/(\\d+)$`))
    if (m) {
      const rowId = Number(m[1])
      const idx = list.findIndex((r) => r.id === rowId)
      if (idx < 0) return json({ error: 'not_found' }, 404)
      if (method === 'PUT') {
        list[idx] = { ...list[idx], ...payload }
        return json(list[idx])
      }
      if (method === 'DELETE') {
        list.splice(idx, 1)
        return json(undefined, 204)
      }
    }
  }

  // ── simulations ──
  if (path === `${g}/simulations`) {
    if (method === 'GET') return json(store.simulations)
    if (method === 'POST') {
      const row = { id: ++store.seq, organizationId: ORG_ID, capacityDefinitionId: payload.capacityDefinitionId ?? null, name: payload.name ?? 'Untitled simulation', simulationType: payload.simulationType ?? 'capacity_simulation', inputParams: payload.inputParams ?? {}, status: 'completed', ranByUserId: 1, ranAt: FIXED_TS, createdAt: FIXED_TS, results: summarizeSim(payload.simulationType ?? 'capacity_simulation', payload.inputParams ?? {}) }
      store.simulations.unshift(row)
      return json(row, 201)
    }
  }
  m = path.match(new RegExp(`${g}/simulations/(\\d+)$`))
  if (m && method === 'DELETE') {
    store.simulations = store.simulations.filter((s) => s.id !== Number(m![1]))
    return json(undefined, 204)
  }

  // ── audit ──
  if (path.startsWith(`${g}/audit`) && method === 'GET') {
    const url = new URL(path, 'http://x')
    const defId = url.searchParams.get('definitionId')
    const rows = defId ? store.audit.filter((a) => a.capacityDefinitionId === Number(defId)) : store.audit
    return json(rows)
  }

  // ── auth/me ──
  if (path === '/api/auth/me') {
    return json({ id: 1, email: 'lead@ensured.test', firstName: 'Gov', lastName: 'Lead', role: 'insurer', organizationId: ORG_ID })
  }

  return json({ error: 'unhandled_mock_route', path, method }, 404)
}

function applyFetchOverride(): void {
  if (!originalFetch) originalFetch = window.fetch.bind(window)
  window.fetch = (async (input: any, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input?.url ?? ''
    const method = (init?.method ?? (typeof input === 'object' ? input?.method : 'GET') ?? 'GET').toUpperCase()
    if (url.includes('/governance/') || url.endsWith('/api/auth/me')) {
      let payload: AnyRow = {}
      try {
        payload = init?.body ? JSON.parse(init.body as string) : {}
      } catch {
        payload = {}
      }
      const pathOnly = url.replace(/^https?:\/\/[^/]+/, '')
      return route(method, pathOnly, payload)
    }
    return (originalFetch as typeof window.fetch)(input, init)
  }) as typeof window.fetch
}

function installGovernanceMock(reset: boolean): void {
  if (reset) store = freshStore()
  // Seed a token so getAuthToken()/useAuthMe resolve an org even before /auth/me.
  try {
    const payload = btoa(JSON.stringify({ userId: 1, email: 'lead@ensured.test', role: 'insurer', organizationId: ORG_ID }))
    window.localStorage.setItem('authToken', `header.${payload}.sig`)
  } catch {
    /* ignore */
  }
  applyFetchOverride()
}

// The store is reset once per *story id*. React StrictMode double-mounts the
// decorator, and switching stories remounts it — resetting on every mount would
// wipe a mutation the play just made (a deleted row would reappear). Keying the
// reset to the story id makes mutations survive the remount while still giving
// each distinct story a fresh store.
let seededForStory: string | null = null

/**
 * Story decorator: installs the stateful mock + auth token, resetting the store
 * only when the story changes, and restores fetch on unmount.
 */
export const withGovernanceApi: Decorator = (Story, context) => {
  const id = context?.id ?? 'unknown'
  if (seededForStory !== id) {
    installGovernanceMock(true)
    seededForStory = id
  } else {
    applyFetchOverride()
  }
  React.useEffect(
    () => () => {
      if (originalFetch) window.fetch = originalFetch
    },
    [],
  )
  return (
    <div style={{ minHeight: '100vh', background: 'var(--xds-surface, #0b1326)', padding: '1.5rem' }}>
      <Story />
    </div>
  )
}
