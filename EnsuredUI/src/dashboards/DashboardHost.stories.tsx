import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import DashboardHost from './DashboardHost';
import type { SurfaceRegistry } from './registry';
import type { ResolvedDashboard } from './types';
import { button, click, notSeeText, play, seeText } from '../test-helpers/play';

// A stub surface that exercises the host mechanics (cascade tag, edit toggle,
// add/remove, admin scope switch) without pulling in the real analytics or
// marketplace data providers. Three catalog widgets; two placed, one addable.
const registry: SurfaceRegistry = {
  'w-a': () => <div>Widget A body</div>,
  'w-b': () => <div>Widget B body</div>,
  'w-c': () => <div>Widget C body</div>,
};

const catalog = [
  {
    widgetKey: 'w-a',
    title: 'Widget A',
    category: 'demo',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 2, h: 2 },
    settingsSchema: [
      { key: 'monthsBack', label: 'Time range (months)', type: 'number' as const, default: 12, min: 3, max: 24, step: 1 },
      { key: 'showRefLine', label: 'Show reference line', type: 'boolean' as const, default: true },
    ],
  },
  { widgetKey: 'w-b', title: 'Widget B', category: 'demo', defaultSize: { w: 6, h: 4 }, minSize: { w: 2, h: 2 } },
  { widgetKey: 'w-c', title: 'Widget C', category: 'demo', defaultSize: { w: 6, h: 4 }, minSize: { w: 2, h: 2 } },
];

const baseData: ResolvedDashboard = {
  surfaceKey: 'insurer-analytics',
  source: 'platform',
  catalog,
  presets: [],
  org: null,
  platform: {
    surfaceKey: 'insurer-analytics',
    version: 1,
    items: [
      { widgetKey: 'w-a', x: 0, y: 0, w: 6, h: 4 },
      { widgetKey: 'w-b', x: 6, y: 0, w: 6, h: 4 },
    ],
  },
  effective: {
    surfaceKey: 'insurer-analytics',
    version: 1,
    items: [
      { widgetKey: 'w-a', x: 0, y: 0, w: 6, h: 4 },
      { widgetKey: 'w-b', x: 6, y: 0, w: 6, h: 4 },
    ],
  },
};

const meta: Meta<typeof DashboardHost> = {
  title: 'Dashboards/DashboardHost',
  component: DashboardHost,
};
export default meta;

type Story = StoryObj<typeof DashboardHost>;

/** Read-only view: shows the resolved tier and renders placed widget bodies. */
export const ViewMode: Story = {
  render: () => <DashboardHost surfaceKey="insurer-analytics" registry={registry} initialData={baseData} />,
  play: play(
    seeText(/platform default/i),
    seeText('Widget A body'),
    seeText('Widget B body'),
    notSeeText(/save/i),
  ),
};

/** Customize → enter edit mode, open the Add panel, see the unplaced widget. */
export const EditMode: Story = {
  render: () => <DashboardHost surfaceKey="insurer-analytics" registry={registry} initialData={baseData} />,
  play: play(
    click(button(/customize/i)),
    seeText(/save/i),
    seeText(/cancel/i),
    click(button(/add widget/i)),
    seeText(/Widget C/i),
  ),
};

/** Configure a single widget: the gear opens the settings drawer for that widget. */
export const ConfigureWidget: Story = {
  render: () => <DashboardHost surfaceKey="insurer-analytics" registry={registry} initialData={baseData} />,
  play: play(
    click(button(/customize/i)),
    click(button(/configure widget a/i)),
    seeText(/configure/i),
    seeText(/time range/i),
    seeText(/show reference line/i),
  ),
};

/** Admin sees the org-scope affordance and can switch the editing target. */
export const AdminOrgScope: Story = {
  render: () => (
    <DashboardHost surfaceKey="insurer-analytics" registry={registry} initialData={baseData} forceAdmin />
  ),
  play: play(
    click(button(/edit org default/i)),
    seeText(/organization default/i),
  ),
};
