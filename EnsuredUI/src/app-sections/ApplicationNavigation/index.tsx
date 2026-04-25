import React from 'react'
import Navigation, { NavItem } from '../../xds/components/Navigation'

// Route lists grouped by user type. These map directly to the xds `Navigation` items prop.
export const investorRoutes: NavItem[] = [
  { id: '/investor/dashboard', label: 'Dashboard', icon: '🏠' },
  { id: '/investor/portfolio', label: 'Portfolio', icon: '📊', subItems: [
    { id: '/investor/portfolio/overview', label: 'Overview' },
    { id: '/investor/portfolio/performance', label: 'Performance' },
    { id: '/investor/portfolio/allocation', label: 'Allocation' }
  ] },
  { id: '/investor/capital', label: 'Capital', icon: '💰', subItems: [
    { id: '/investor/capital/deposit', label: 'Deposit' },
    { id: '/investor/capital/withdraw', label: 'Withdraw' },
    { id: '/investor/capital/transactions', label: 'Transactions' }
  ] },
  { id: '/investor/deals', label: 'Deals', icon: '🤝', subItems: [
    { id: '/investor/deals', label: 'All Deals' },
    { id: '/investor/deals/:dealId', label: 'Deal Details' }
  ] },
  { id: '/investor/events', label: 'Events', icon: '📅' },
  { id: '/investor/ledger', label: 'Ledger', icon: '📘' },
  { id: '/investor/settings', label: 'Settings', icon: '⚙️' }
]

export const insurerRoutes: NavItem[] = [
  { id: '/insurer/dashboard', label: 'Dashboard', icon: '🏢' },
  { id: '/insurer/risk', label: 'Risk', icon: '⚠️', subItems: [
    { id: '/insurer/risk/upload', label: 'Upload' },
    { id: '/insurer/risk/history', label: 'History' },
    { id: '/insurer/risk/validation', label: 'Validation' }
  ] },
  { id: '/insurer/portfolio', label: 'Portfolio', icon: '📈' },
  { id: '/insurer/coverage', label: 'Coverage', icon: '🛡️', subItems: [
    { id: '/insurer/coverage/create', label: 'Create' },
    { id: '/insurer/coverage/simulate', label: 'Simulate' },
    { id: '/insurer/coverage/pricing', label: 'Pricing' }
  ] },
  { id: '/insurer/coverage-active', label: 'Active Coverage', icon: '✅' },
  { id: '/insurer/claims', label: 'Claims', icon: '📝' },
  { id: '/insurer/reports', label: 'Reports', icon: '📑' },
  { id: '/insurer/settings', label: 'Settings', icon: '⚙️' }
]

export const adminRoutes: NavItem[] = [
  { id: '/admin/dashboard', label: 'Dashboard', icon: '🧭' },
  { id: '/admin/deals', label: 'Deals', icon: '📦', subItems: [
    { id: '/admin/deals', label: 'All Deals' },
    { id: '/admin/deals/create', label: 'Create Deal' }
  ] },
  { id: '/admin/risk', label: 'Risk', icon: '🔬' },
  { id: '/admin/capital', label: 'Capital', icon: '🏦' },
  { id: '/admin/events', label: 'Events', icon: '📣' },
  { id: '/admin/payouts', label: 'Payouts', icon: '💸' },
  { id: '/admin/users', label: 'Users', icon: '👥' },
  { id: '/admin/audit', label: 'Audit', icon: '📂' },
  { id: '/admin/settings', label: 'Settings', icon: '⚙️' }
]

export const authRoutes: NavItem[] = [
  { id: '/auth/login', label: 'Log in', icon: '🔐' },
  { id: '/auth/register', label: 'Register', icon: '🆕' },
  { id: '/auth/forgot-password', label: 'Forgot Password', icon: '❓' }
]

export const underwritingRoutes: NavItem[] = [
  { id: '/underwriting/dashboard', label: 'Dashboard', icon: '🏷️' },
  { id: '/underwriting/queue', label: 'Queue', icon: '📥' },
  { id: '/underwriting/activity', label: 'Activity', icon: '📋' },
  { id: '/underwriting/submissions', label: 'Incoming Submissions', icon: '🗂️', subItems: [
    { id: '/underwriting/submissions', label: 'All Submissions' },
    { id: '/underwriting/submissions/:submissionId', label: 'Submission Details' }
  ] },
  { id: '/underwriting/models', label: 'Models', icon: '🧠', subItems: [
    { id: '/underwriting/models', label: 'All Models' },
    { id: '/underwriting/models/:modelId', label: 'Model Details' }
  ] },
  { id: '/underwriting/scenarios', label: 'Scenarios', icon: '🔎' },
  { id: '/underwriting/pricing', label: 'Pricing', icon: '💵' },
  { id: '/underwriting/structures', label: 'Structures', icon: '🏗️' },
  { id: '/underwriting/approvals', label: 'Approvals', icon: '✅' },
  { id: '/underwriting/assumptions', label: 'Assumptions', icon: '📐' }
]

export const marketplaceRoutes: NavItem[] = [
  { id: '/marketplace', label: 'Marketplace', icon: '🛒', subItems: [
    { id: '/marketplace/featured', label: 'Featured' },
    { id: '/marketplace/categories', label: 'Categories' },
    { id: '/marketplace/search', label: 'Search' }
  ] },
  { id: '/marketplace/:dealId', label: 'Deal', icon: '🧾', subItems: [
    { id: '/marketplace/:dealId/overview', label: 'Overview' },
    { id: '/marketplace/:dealId/orderbook', label: 'Orderbook' },
    { id: '/marketplace/:dealId/activity', label: 'Activity' }
  ] }
]

export const ordersRoutes: NavItem[] = [
  { id: '/orders', label: 'Orders', icon: '📦', subItems: [
    { id: '/orders/create', label: 'Create' },
    { id: '/orders/pending', label: 'Pending' },
    { id: '/orders/filled', label: 'Filled' },
    { id: '/orders/cancelled', label: 'Cancelled' }
  ] }
]

export const secondaryMarketRoutes: NavItem[] = [
  { id: '/secondary-market', label: 'Secondary Market', icon: '🔁', subItems: [
    { id: '/secondary-market/listings', label: 'Listings' },
    { id: '/secondary-market/my-listings', label: 'My Listings' },
    { id: '/secondary-market/trades', label: 'Trades' }
  ] }
]

export const notificationsRoutes: NavItem[] = [
  { id: '/notifications', label: 'Notifications', icon: '🔔', subItems: [
    { id: '/notifications/unread', label: 'Unread' },
    { id: '/notifications/settings', label: 'Settings' }
  ] }
]

export const documentsRoutes: NavItem[] = [
  { id: '/documents', label: 'Documents', icon: '📄', subItems: [
    { id: '/documents/agreements', label: 'Agreements' },
    { id: '/documents/contracts', label: 'Contracts' },
    { id: '/documents/spv', label: 'SPV' }
  ] }
]

export const integrationsRoutes: NavItem[] = [
  { id: '/integrations', label: 'Integrations', icon: '🔗', subItems: [
    { id: '/integrations/webhooks', label: 'Webhooks' },
    { id: '/integrations/api-keys', label: 'API Keys' },
    { id: '/integrations/logs', label: 'Logs' }
  ] }
]

export const reportsRoutes: NavItem[] = [
  { id: '/reports', label: 'Reports', icon: '📊', subItems: [
    { id: '/reports/investor', label: 'Investor' },
    { id: '/reports/insurer', label: 'Insurer' }
  ] }
]

export const treasuryRoutes: NavItem[] = [
  { id: '/treasury', label: 'Treasury', icon: '🏦', subItems: [
    { id: '/treasury/accounts', label: 'Accounts' },
    { id: '/treasury/balances', label: 'Balances' },
    { id: '/treasury/movements', label: 'Movements' }
  ] }
]

export const systemRoutes: NavItem[] = [
  { id: '/system', label: 'System', icon: '🛠️', subItems: [
    { id: '/system/status', label: 'Status' },
    { id: '/system/incidents', label: 'Incidents' },
    { id: '/system/history', label: 'History' }
  ] }
]

export const organizationRoutes: NavItem[] = [
  { id: '/organization', label: 'Organization', icon: '🏢', subItems: [
    { id: '/organization/members', label: 'Members' },
    { id: '/organization/roles', label: 'Roles' },
    { id: '/organization/permissions', label: 'Permissions' }
  ] }
]

// Small wrapper components that render the xds `Navigation` with the appropriate set of items.
export const InvestorNavigation: React.FC = () => <Navigation items={investorRoutes} />
export const InsurerNavigation: React.FC = () => <Navigation items={insurerRoutes} />
export const AdminNavigation: React.FC = () => <Navigation items={adminRoutes} />
export const AuthNavigation: React.FC = () => <Navigation items={authRoutes} />
export const UnderwritingNavigation: React.FC = () => <Navigation items={underwritingRoutes} />
export const MarketplaceNavigation: React.FC = () => <Navigation items={marketplaceRoutes} />
export const OrdersNavigation: React.FC = () => <Navigation items={ordersRoutes} />
export const SecondaryMarketNavigation: React.FC = () => <Navigation items={secondaryMarketRoutes} />
export const NotificationsNavigation: React.FC = () => <Navigation items={notificationsRoutes} />
export const DocumentsNavigation: React.FC = () => <Navigation items={documentsRoutes} />
export const IntegrationsNavigation: React.FC = () => <Navigation items={integrationsRoutes} />
export const ReportsNavigation: React.FC = () => <Navigation items={reportsRoutes} />
export const TreasuryNavigation: React.FC = () => <Navigation items={treasuryRoutes} />
export const SystemNavigation: React.FC = () => <Navigation items={systemRoutes} />
export const OrganizationNavigation: React.FC = () => <Navigation items={organizationRoutes} />

export default {
  InvestorNavigation,
  InsurerNavigation,
  AdminNavigation,
  AuthNavigation,
  UnderwritingNavigation,
  MarketplaceNavigation,
  OrdersNavigation,
  SecondaryMarketNavigation,
  NotificationsNavigation,
  DocumentsNavigation,
  IntegrationsNavigation,
  ReportsNavigation,
  TreasuryNavigation,
  SystemNavigation,
  OrganizationNavigation,
  investorRoutes,
  insurerRoutes,
  adminRoutes,
  authRoutes
  ,underwritingRoutes
  ,marketplaceRoutes
  ,ordersRoutes
  ,secondaryMarketRoutes
  ,notificationsRoutes
  ,documentsRoutes
  ,integrationsRoutes
  ,reportsRoutes
  ,treasuryRoutes
  ,systemRoutes
  ,organizationRoutes
}
