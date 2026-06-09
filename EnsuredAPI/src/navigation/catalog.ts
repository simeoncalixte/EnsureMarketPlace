import { userRoles } from '../db/models/constants';

/**
 * Role-driven side navigation.
 *
 * This module is the single source of truth for "what can this user see and
 * reach". The frontend renders whatever tree the API hands back for the current
 * session rather than hardcoding links, so a user is never shown an entry point
 * to a workspace their role has no business operating.
 *
 * Every `path` below maps to a real route registered in the UI router
 * (EnsuredUI/src/AppRoutes.tsx). When you add a nav node here, make sure the
 * route exists there too — `collectNavPaths()` is exported so a test can assert
 * the two stay in sync.
 *
 * The four system roles (see `userRoles` in db/models/constants) map onto the
 * real personas of a programmable reinsurance marketplace:
 *   - insurer  → the ceding company: defines appetite, ingests and triages
 *                submissions, structures/prices coverage, cedes it to capital.
 *   - investor → the reinsurance capital partner (ILS / fund): browses the
 *                marketplace, holds a portfolio of tranches, tracks losses.
 *   - analyst  → underwriting / claims / broker analysts: work the risk through
 *                modeling, validation and pricing analysis (no admin or capital
 *                controls).
 *   - admin    → platform operations: oversight across every workspace.
 */

export type SystemRole = (typeof userRoles)[number];

/**
 * A single navigation node. Mirrors the frontend `NavItem` shape minus `active`
 * (active state is a function of the current URL and is computed client-side).
 */
export type NavNode = {
  /** Route path the link points to — must exist in the UI router. */
  id: string;
  /** Human label shown in the sidebar. */
  label: string;
  /** Short glyph/abbreviation rendered in the leading slot (matches existing style). */
  icon?: string;
  /** Optional right-aligned hint (e.g. a keyboard shortcut). */
  shortcut?: string;
  /** Nested entries, revealed when the parent is active or expanded. */
  subItems?: NavNode[];
};

// ---------------------------------------------------------------------------
// Reusable leaf nodes — referenced from more than one role's tree. Defining
// them once keeps labels/icons consistent across personas.
// ---------------------------------------------------------------------------

const marketplace: NavNode = { id: '/marketplace', label: 'Marketplace', icon: 'MKT' };
const reports: NavNode = { id: '/insurer/reports', label: 'Reports', icon: 'RPT' };
const settings: NavNode = { id: '/insurer/settings', label: 'Settings', icon: 'SET' };

// ---------------------------------------------------------------------------
// Per-role navigation trees.
// ---------------------------------------------------------------------------

const insurerNavigation: NavNode[] = [
  { id: '/insurer', label: 'Dashboard', icon: 'DSH' },
  {
    // The parent link itself is the submissions inbox; children drill into the
    // triage/modeling workbench for an individual risk.
    id: '/underwriting/submissions',
    label: 'Submissions',
    icon: 'SUB',
    subItems: [
      { id: '/underwriting/submissions', label: 'Inbox', icon: 'INB' },
      { id: '/insurer/risk', label: 'Risk Workbench', icon: 'RWB' },
      { id: '/insurer/risk/upload', label: 'Upload Risk', icon: 'UPL' },
      { id: '/insurer/risk/validation', label: 'Validation', icon: 'VAL' },
    ],
  },
  {
    id: '/insurer/appetite',
    label: 'Underwriting',
    icon: 'UW',
    subItems: [
      { id: '/insurer/appetite', label: 'Appetite', icon: 'APP' },
      { id: '/line-of-business', label: 'Line of Business', icon: 'LOB' },
      { id: '/insurer/coverage/choice-controls', label: 'Choice Controls', icon: 'CHC' },
    ],
  },
  {
    id: '/insurer/coverage',
    label: 'Coverage Structuring',
    icon: 'COV',
    subItems: [
      { id: '/insurer/coverage/create', label: 'Create Coverage', icon: 'NEW' },
      { id: '/insurer/coverage/pricing', label: 'Pricing', icon: 'PRC' },
      { id: '/insurer/coverage/simulate', label: 'Simulation', icon: 'SIM' },
      { id: '/insurer/coverage-active', label: 'Active Coverage', icon: 'ACT' },
    ],
  },
  {
    id: '/insurer/pipeline-ingestion',
    label: 'Data Pipeline',
    icon: 'PIPE',
    subItems: [
      { id: '/insurer/pipeline-ingestion', label: 'Ingestion Config', icon: 'ING' },
      { id: '/insurer/pipeline-processes', label: 'Pipeline Processes', icon: 'PRO' },
    ],
  },
  marketplace,
  { id: '/insurer/claims', label: 'Claims', icon: 'CLM' },
  reports,
  settings,
];

const investorNavigation: NavNode[] = [
  { id: '/investors', label: 'Portfolio', icon: 'PRT' },
  marketplace,
  { id: '/claims', label: 'Claims', icon: 'CLM' },
  reports,
  settings,
];

const analystNavigation: NavNode[] = [
  {
    id: '/underwriting/submissions',
    label: 'Submissions',
    icon: 'SUB',
    subItems: [
      { id: '/underwriting/submissions', label: 'Inbox', icon: 'INB' },
      { id: '/insurer/risk', label: 'Risk Workbench', icon: 'RWB' },
      { id: '/insurer/risk/validation', label: 'Validation', icon: 'VAL' },
    ],
  },
  { id: '/insurer/appetite', label: 'Appetite', icon: 'APP' },
  { id: '/line-of-business', label: 'Line of Business', icon: 'LOB' },
  {
    id: '/insurer/coverage/pricing',
    label: 'Pricing & Modeling',
    icon: 'PRC',
    subItems: [
      { id: '/insurer/coverage/pricing', label: 'Pricing', icon: 'PRC' },
      { id: '/insurer/coverage/simulate', label: 'Simulation', icon: 'SIM' },
    ],
  },
  marketplace,
  { id: '/claims', label: 'Claims', icon: 'CLM' },
  reports,
];

const adminNavigation: NavNode[] = [
  { id: '/admin', label: 'Admin Console', icon: 'ADM' },
  { id: '/admin/deals/create', label: 'Create Deal', icon: 'DEAL' },
  marketplace,
  { id: '/investors', label: 'Investors', icon: 'INV' },
  {
    id: '/insurer',
    label: 'Insurer Workspace',
    icon: 'INS',
    subItems: [
      { id: '/insurer', label: 'Dashboard', icon: 'DSH' },
      { id: '/insurer/coverage/create', label: 'Create Coverage', icon: 'NEW' },
      { id: '/insurer/coverage-active', label: 'Active Coverage', icon: 'ACT' },
      { id: '/insurer/appetite', label: 'Appetite', icon: 'APP' },
    ],
  },
  {
    id: '/insurer/pipeline-ingestion',
    label: 'Data Pipeline',
    icon: 'PIPE',
    subItems: [
      { id: '/insurer/pipeline-ingestion', label: 'Ingestion Config', icon: 'ING' },
      { id: '/insurer/pipeline-processes', label: 'Pipeline Processes', icon: 'PRO' },
    ],
  },
  { id: '/claims', label: 'Claims', icon: 'CLM' },
  reports,
  settings,
];

const navigationByRole: Record<SystemRole, NavNode[]> = {
  insurer: insurerNavigation,
  investor: investorNavigation,
  analyst: analystNavigation,
  admin: adminNavigation,
};

/**
 * The route an authenticated user of this role should land on after login when
 * no explicit destination is requested. Kept here so the API can advertise it
 * alongside the menu (the UI currently hardcodes `/marketplace`).
 */
const homePathByRole: Record<SystemRole, string> = {
  insurer: '/insurer',
  investor: '/investors',
  analyst: '/underwriting/submissions',
  admin: '/admin',
};

function isSystemRole(value: unknown): value is SystemRole {
  return typeof value === 'string' && (userRoles as readonly string[]).includes(value);
}

/**
 * Deep-clone the nav tree so callers can safely mutate (e.g. mark active) the
 * result without corrupting the shared module-level definitions.
 */
function cloneNodes(nodes: NavNode[]): NavNode[] {
  return nodes.map((node) => ({
    ...node,
    ...(node.subItems ? { subItems: cloneNodes(node.subItems) } : {}),
  }));
}

/**
 * The navigation tree for a role. Unknown/absent roles fall back to the
 * investor tree — the least-privileged "browse the marketplace" view — so a
 * malformed token never yields an empty or over-privileged sidebar.
 */
export function buildNavigationForRole(role: unknown): NavNode[] {
  const resolved: SystemRole = isSystemRole(role) ? role : 'investor';
  return cloneNodes(navigationByRole[resolved]);
}

/** Default landing route for a role (falls back to the marketplace). */
export function homePathForRole(role: unknown): string {
  return isSystemRole(role) ? homePathByRole[role] : '/marketplace';
}

/** Flat set of every distinct route path reachable in a role's tree. */
export function collectNavPaths(nodes: NavNode[]): string[] {
  const out = new Set<string>();
  const walk = (items: NavNode[]) => {
    for (const item of items) {
      out.add(item.id);
      if (item.subItems) walk(item.subItems);
    }
  };
  walk(nodes);
  return [...out];
}

export const navigationCatalog = navigationByRole;
