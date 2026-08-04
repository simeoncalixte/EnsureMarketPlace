import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import * as api from './api';
import useDashboardLifecycle from './useDashboardLifecycle';
import type { ResolvedDashboard, DashboardLayoutDoc } from './types';

export default { title: 'Dashboards/useDashboardLifecycle' } as Meta;

function Demo({ surfaceKey }: { surfaceKey: string }) {
  const { data, loading, error, busy, load, saveLayout, resetLayout } = useDashboardLifecycle(surfaceKey, null as any);

  const sampleDoc: DashboardLayoutDoc = { surfaceKey: 'marketplace', version: 1, items: [] };

  return (
    <div style={{ padding: 12 }}>
      <div><strong>Loading:</strong> {String(loading)}</div>
      <div><strong>Busy:</strong> {String(busy)}</div>
      <div><strong>Error:</strong> {String(error)}</div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => void load()}>Reload</button>
        <button onClick={async () => { try { await saveLayout(sampleDoc, 'user'); } catch {} }}>Save (user)</button>
        <button onClick={async () => { try { await saveLayout(sampleDoc, 'org', 1); } catch {} }}>Save (org)</button>
        <button onClick={async () => { try { await resetLayout('user'); } catch {} }}>Reset (user)</button>
        <button onClick={async () => { try { await resetLayout('org', 1); } catch {} }}>Reset (org)</button>
      </div>
      <pre style={{ marginTop: 8 }}>{JSON.stringify(data ?? {}, null, 2)}</pre>
    </div>
  );
}

const sampleData: ResolvedDashboard = {
  surfaceKey: 'marketplace',
  effective: { surfaceKey: 'marketplace', version: 1, items: [] },
  source: 'platform',
  org: null,
  platform: { surfaceKey: 'marketplace', version: 1, items: [] },
  catalog: [],
  presets: [],
};

export const LoadSuccess: StoryFn = () => {
  api.getDashboard = async () => sampleData as any;
  api.saveUserLayout = async () => sampleData as any;
  api.saveOrgLayout = async () => sampleData as any;
  api.resetUserLayout = async () => sampleData as any;
  api.resetOrgLayout = async () => {};
  return <Demo surfaceKey="marketplace" />;
};

export const LoadError: StoryFn = () => {
  api.getDashboard = async () => { throw new Error('Not found'); };
  return <Demo surfaceKey="marketplace" />;
};

export const SaveBusyAndError: StoryFn = () => {
  api.getDashboard = async () => sampleData as any;
  api.saveUserLayout = async () => { await new Promise((r) => setTimeout(r, 300)); return sampleData as any; };
  api.saveOrgLayout = async (organizationId: number) => { if (organizationId === 0) throw new Error('No org'); await new Promise((r) => setTimeout(r, 300)); return sampleData as any; };
  api.resetUserLayout = async () => { await new Promise((r) => setTimeout(r, 200)); return sampleData as any; };
  api.resetOrgLayout = async () => { await new Promise((r) => setTimeout(r, 200)); };
  return <Demo surfaceKey="marketplace" />;
};
