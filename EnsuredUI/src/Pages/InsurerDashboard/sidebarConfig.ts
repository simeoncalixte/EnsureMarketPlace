import type { NavItem } from '../../xds/components/Navigation'

export const insurerSidebar: NavItem[] = [
  { id: '/insurer/dashboard', label: 'Dashboard', icon: '🏢' },
  { id: '/insurer/risk', label: 'Risk', icon: '⚠️', subItems: [
    { id: '/insurer/risk/upload', label: 'Upload' },
    { id: '/insurer/risk/history', label: 'History' },
    { id: '/insurer/risk/validation', label: 'Validation' }
  ] },
  { id: '/insurer/portfolio', label: 'Portfolio', icon: '📈' },
  { id: '/insurer/coverage', label: 'Coverage', icon: '🛡️', subItems: [
    { id: '/insurer/coverage/create', label: 'Create' },
    { id: '/insurer/coverage/line-of-business', label: 'Line of Business' },
    { id: '/insurer/coverage/simulate', label: 'Simulate' },
    { id: '/insurer/coverage/pricing', label: 'Pricing' }
  ] },
  { id: '/insurer/coverage-active', label: 'Active Coverage', icon: '✅' },
  { id: '/insurer/pipeline-ingestion', label: 'Ingestion', icon: '📥', subItems: [
    { id: '/insurer/pipeline-ingestion/rabbitmq', label: 'RabbitMQ Nodes' },
    { id: '/insurer/pipeline-ingestion/email-sso', label: 'Email SSO' },
    { id: '/insurer/pipeline-ingestion/cloud-storage', label: 'Cloud Storage' },
    { id: '/insurer/pipeline-ingestion/sftp', label: 'SFTP' },
    { id: '/insurer/pipeline-ingestion/webhooks', label: 'Webhooks' }
  ] },
  { id: '/insurer/pipeline-processes', label: 'Pipeline Processes', icon: 'PP' },
  { id: '/insurer/claims', label: 'Claims', icon: '📝' },
  { id: '/insurer/reports', label: 'Reports', icon: '📑' },
  { id: '/insurer/settings', label: 'Settings', icon: '⚙️' }
]
