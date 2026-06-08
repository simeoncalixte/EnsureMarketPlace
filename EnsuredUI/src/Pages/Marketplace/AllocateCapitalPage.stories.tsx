import React, { useEffect, useState } from 'react';
import { Meta, StoryFn } from '@storybook/react';
import AllocateCapitalPage from './AllocateCapitalPage';

// Preload available deal IDs at module load so stories can reuse them.
const preloadedDealIdsPromise: Promise<Array<number | string>> = (async () => {
  try {
    const base = (import.meta as any)?.env?.VITE_API_BASE ?? '';
    const url = (base ? String(base).replace(/\/$/, '') : '') + '/api/marketplace/opportunities/active-pending-funding';
    const res = await fetch(url);
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body) ? Array.from(new Set(body.map((it: any) => it.dealId))).slice(0, 20) : [];
  } catch (err) {
    return [];
  }
})();

const meta: Meta = {
  title: 'Pages/Marketplace/AllocateCapitalPage',
  component: AllocateCapitalPage,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    initialTrancheId: {
      control: { type: 'select' },
      options: ['senior-a1', 'mezzanine-b2', 'equity'],
      description: 'Select the tranche id currently in view',
    },
    // initialPoolId will be controlled in-story via a runtime selector populated from the API
    apiBase: {
      control: { type: 'text' },
      description: 'API base URL (overrides same-origin). Use e.g. http://localhost:3001',
      table: { defaultValue: { summary: 'http://localhost:3001' } },
    },
  },
};

export default meta;

type StoryArgs = {
  initialTrancheId?: string;
  initialPoolId?: number | string;
  apiBase?: string;
};

const Template: StoryFn<StoryArgs> = (args) => {
  const [dealIds, setDealIds] = useState<Array<number | string>>([]);
  const [selectedDeal, setSelectedDeal] = useState<number | string | undefined>(args.initialPoolId);

  useEffect(() => {
    // set runtime API base from story arg so page uses that host
    try {
      (window as any).__API_BASE__ = args.apiBase ?? '';
    } catch (e) {
      // ignore in non-browser environments
    }
  }, [args.apiBase]);

  useEffect(() => {
    let cancelled = false;
    preloadedDealIdsPromise.then((ids) => {
      if (cancelled) return;
      setDealIds(ids);
      if (ids.length > 0 && selectedDeal === undefined) setSelectedDeal(ids[0]);
    });
    return () => { cancelled = true; };
  }, [args.apiBase]);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8, fontWeight: 700 }}>Select Deal ID:</label>
        <select value={String(selectedDeal ?? '')} onChange={(e) => setSelectedDeal(e.target.value)}>
          <option value="">(none)</option>
          {dealIds.map((d) => (
            <option key={String(d)} value={String(d)}>{String(d)}</option>
          ))}
        </select>
      </div>
      <AllocateCapitalPage {...args} initialPoolId={1 as unknown as string} />
    </div>
  );
};

export const Default = Template.bind({});
Default.args = {
  initialTrancheId: 'mezzanine-b2',
  initialPoolId: 1,
};
