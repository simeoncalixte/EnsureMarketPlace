import type { SettingsSchema } from './types';

const valueOptions = [
  { value: 'totalOpenCapacity', label: 'Total open capacity' },
  { value: 'totalFunded', label: 'Total funded' },
  { value: 'activeDeals', label: 'Active deals' },
];

/**
 * Frontend fallback for the Marketplace Overview card editor. The API remains
 * authoritative, but keeping this local schema prevents a stale/cached catalog
 * response from producing an empty settings drawer.
 */
export const MARKETPLACE_STATS_SETTINGS_SCHEMA: SettingsSchema = [
  { key: 'card1Title', label: 'Title', type: 'text', default: 'Total Open Capacity' },
  { key: 'card1Value', label: 'Value source', type: 'select', default: 'totalOpenCapacity', options: valueOptions },
  { key: 'card1Icon', label: 'Icon', type: 'text', default: 'trending_up' },
  { key: 'card1Caption', label: 'Caption', type: 'text', default: 'Live Pending Funding Capacity' },
  { key: 'card2Title', label: 'Title', type: 'text', default: 'Total Funded' },
  { key: 'card2Value', label: 'Value source', type: 'select', default: 'totalFunded', options: valueOptions },
  { key: 'card2Icon', label: 'Icon', type: 'text', default: 'history' },
  { key: 'card2Caption', label: 'Caption', type: 'text', default: 'Funding Already Committed' },
  { key: 'card3Title', label: 'Title', type: 'text', default: 'Active Deals' },
  { key: 'card3Value', label: 'Value source', type: 'select', default: 'activeDeals', options: valueOptions },
  { key: 'card3Icon', label: 'Icon', type: 'text', default: 'pending_actions' },
  { key: 'card3Caption', label: 'Caption', type: 'text', default: 'Active Opportunities Pending Funding' },
];
