import { userRoles } from '../../db/models/constants';
import { submissionTypeTaxonomy } from '../../db/seed-data/submissionTypeTaxonomy';

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
 * The system roles (see `userRoles` in db/models/constants) map onto the
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
  /**
   * Material Symbols icon name (e.g. 'storefront') rendered in the leading
   * slot. The UI renders these via the `material-symbols-outlined` ligature
   * font, so values must be valid symbol names from fonts.google.com/icons.
   */
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

const marketplace: NavNode = { id: '/marketplace', label: 'Marketplace', icon: 'storefront' };
const reports: NavNode = { id: '/insurer/reports', label: 'Reports', icon: 'summarize' };
const settings: NavNode = { id: '/insurer/settings', label: 'Settings', icon: 'settings' };

// The social network is cross-role by design: insurers, reinsurance capital and
// broker analysts all build trust through the same graph, feed and inbox.
// Governance / Capacity Configuration module. The parent link lands on the
// capacity-definition registry; children drill into each control workspace
// (authority, referrals, rules engine, simulation, audit). Shared across the
// underwriting-leadership personas (insurer, analyst, admin).
const governance: NavNode = {
  id: '/governance/capacity',
  label: 'Governance',
  icon: 'policy',
  subItems: [
    { id: '/governance/capacity', label: 'Capacity Definitions', icon: 'account_balance' },
    { id: '/governance/authority', label: 'Authority & Delegation', icon: 'gavel' },
    { id: '/governance/referrals', label: 'Referral Rules', icon: 'call_split' },
    { id: '/governance/rules-engine', label: 'Rules Engine', icon: 'rule_folder' },
    { id: '/governance/simulation', label: 'Simulation & Testing', icon: 'science' },
    { id: '/governance/audit', label: 'Audit & Governance', icon: 'history' },
  ],
};

// Short, nav-appropriate labels + icons per submission type. Derived against the
// submission-type taxonomy below so the menu can never drift from the routes the
// backend supports; a new type without an entry here still gets a link (its
// taxonomy label + a default icon).
const PIPELINE_TYPE_NAV: Record<string, { label: string; icon: string }> = {
  new_business: { label: 'New Business', icon: 'note_add' },
  renewal: { label: 'Renewal', icon: 'autorenew' },
  quote_request: { label: 'Quote Request', icon: 'request_quote' },
  endorsement: { label: 'Endorsement', icon: 'edit_document' },
  cancellation: { label: 'Cancellation', icon: 'cancel' },
  claim: { label: 'Claims', icon: 'report' },
  audit: { label: 'Premium Audit', icon: 'fact_check' },
  treaty_reinsurance: { label: 'Treaty', icon: 'handshake' },
  facultative_reinsurance: { label: 'Facultative', icon: 'call_split' },
  inquiry: { label: 'Inquiry', icon: 'help' },
};

// The Data Pipeline menu: ingestion config, the combined board, then one board
// per submission-type route (/insurer/pipeline/:routeKey). Shared by the insurer
// and admin trees. Each per-type id must also be listed in the UI router and the
// navigation test's VALID_UI_ROUTES.
const dataPipeline: NavNode = {
  id: '/insurer/pipeline-ingestion',
  label: 'Data Pipeline',
  icon: 'account_tree',
  subItems: [
    { id: '/insurer/pipeline-ingestion', label: 'Ingestion Config', icon: 'input' },
    { id: '/insurer/pipeline-processes', label: 'All Submissions', icon: 'timeline' },
    { id: '/insurer/pipeline-flow', label: 'Pipeline Flow', icon: 'account_tree' },
    ...submissionTypeTaxonomy.map((type) => ({
      id: `/insurer/pipeline/${type.code}`,
      label: PIPELINE_TYPE_NAV[type.code]?.label ?? type.label,
      icon: PIPELINE_TYPE_NAV[type.code]?.icon ?? 'lan',
    })),
  ],
};

const network: NavNode = { id: '/network', label: 'Network', icon: 'hub' };
const feed: NavNode = { id: '/feed', label: 'Feed', icon: 'dynamic_feed' };
const messages: NavNode = { id: '/messages', label: 'Messages', icon: 'chat' };

// ---------------------------------------------------------------------------
// Per-role navigation trees.
// ---------------------------------------------------------------------------

const insurerNavigation: NavNode[] = [
  { id: '/insurer', label: 'Dashboard', icon: 'dashboard' },
  {
    // The parent link itself is the submissions inbox; children drill into the
    // triage/modeling workbench for an individual risk.
    id: '/underwriting/submissions',
    label: 'Submissions',
    icon: 'inbox',
    subItems: [
      { id: '/underwriting/submissions', label: 'Inbox', icon: 'inbox' },
      { id: '/insurer/risk', label: 'Risk Workbench', icon: 'troubleshoot' },
      { id: '/insurer/risk/upload', label: 'Upload Risk', icon: 'upload_file' },
      { id: '/insurer/risk/validation', label: 'Validation', icon: 'rule' },
    ],
  },
  {
    id: '/line-of-business',
    label: 'Underwriting',
    icon: 'verified_user',
    subItems: [
      { id: '/line-of-business', label: 'Line of Business', icon: 'category' },
      { id: '/insurer/coverage/choice-controls', label: 'Choice Controls', icon: 'toggle_on' },
    ],
  },
  {
    id: '/insurer/coverage',
    label: 'Coverage Structuring',
    icon: 'shield',
    subItems: [
      { id: '/insurer/coverage/create', label: 'Create Coverage', icon: 'add_circle' },
      { id: '/insurer/coverage/pricing', label: 'Pricing', icon: 'payments' },
      { id: '/insurer/coverage/simulate', label: 'Simulation', icon: 'query_stats' },
      { id: '/insurer/coverage-active', label: 'Active Coverage', icon: 'verified' },
    ],
  },
  governance,
  dataPipeline,
  marketplace,
  network,
  feed,
  messages,
  { id: '/insurer/claims', label: 'Claims', icon: 'receipt_long' },
  reports,
  settings,
];

const investorNavigation: NavNode[] = [
  { id: '/investors', label: 'Portfolio', icon: 'pie_chart' },
  marketplace,
  network,
  feed,
  messages,
  { id: '/claims', label: 'Claims', icon: 'receipt_long' },
  reports,
  settings,
];

const analystNavigation: NavNode[] = [
  {
    id: '/underwriting/submissions',
    label: 'Submissions',
    icon: 'inbox',
    subItems: [
      { id: '/underwriting/submissions', label: 'Inbox', icon: 'inbox' },
      { id: '/insurer/risk', label: 'Risk Workbench', icon: 'troubleshoot' },
      { id: '/insurer/risk/validation', label: 'Validation', icon: 'rule' },
    ],
  },
  { id: '/line-of-business', label: 'Line of Business', icon: 'category' },
  governance,
  {
    id: '/insurer/coverage/pricing',
    label: 'Pricing & Modeling',
    icon: 'payments',
    subItems: [
      { id: '/insurer/coverage/pricing', label: 'Pricing', icon: 'payments' },
      { id: '/insurer/coverage/simulate', label: 'Simulation', icon: 'query_stats' },
    ],
  },
  marketplace,
  network,
  feed,
  messages,
  { id: '/claims', label: 'Claims', icon: 'receipt_long' },
  reports,
];

const adminNavigation: NavNode[] = [
  { id: '/admin', label: 'Admin Console', icon: 'admin_panel_settings' },
  { id: '/admin/deals/create', label: 'Create Deal', icon: 'handshake' },
  marketplace,
  { id: '/investors', label: 'Investors', icon: 'groups' },
  {
    id: '/insurer',
    label: 'Insurer Workspace',
    icon: 'domain',
    subItems: [
      { id: '/insurer', label: 'Dashboard', icon: 'dashboard' },
      { id: '/insurer/coverage/create', label: 'Create Coverage', icon: 'add_circle' },
      { id: '/insurer/coverage-active', label: 'Active Coverage', icon: 'verified' },
    ],
  },
  governance,
  dataPipeline,
  network,
  feed,
  messages,
  { id: '/claims', label: 'Claims', icon: 'receipt_long' },
  reports,
  settings,
];

const navigationByRole: Record<SystemRole, NavNode[]> = {
  insurer: insurerNavigation,
  investor: investorNavigation,
  analyst: analystNavigation,
  admin: adminNavigation,
  // Distribution partners: a minimal view. Partner accounts begin as unclaimed
  // stubs (no login) and gain a fuller experience once the claim flow lands.
  partner: [messages, settings],
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
  partner: '/marketplace',
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
