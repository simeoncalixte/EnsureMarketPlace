import React, { useState } from 'react';
import { Meta } from '@storybook/react';
import useLayoutActions from './useLayoutActions';
import type { LayoutItem } from './types';

export default { title: 'Dashboards/useLayoutActions' } as Meta;

function Demo() {
  const [msg, setMsg] = useState('');

  // Mock implementations
  const saveLayout = async (doc: any) => {
    // simulate network delay
    await new Promise((r) => setTimeout(r, 100));
    setMsg(`Saved ${doc.items.length} items for ${doc.surfaceKey}`);
    return {};
  };
  const resetLayout = async () => {
    await new Promise((r) => setTimeout(r, 100));
    setMsg('Reset layout');
  };

  const mockDraft: LayoutItem[] = [
    { widgetKey: 'w1', x: 0, y: 0, w: 4, h: 6 },
  ];

  const { save, reset } = useLayoutActions({
    saveLayout,
    resetLayout,
    scope: 'user',
    organizationId: null,
    draft: mockDraft,
    surfaceKey: 'marketplace',
    cancelEdit: () => setMsg((m) => m + ' (edit cancelled)'),
  });

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => void save()}>Save</button>
        <button onClick={() => void reset()} style={{ marginLeft: 8 }}>Reset</button>
      </div>
      <div>{msg}</div>
    </div>
  );
}

export const Default = () => <Demo />;
