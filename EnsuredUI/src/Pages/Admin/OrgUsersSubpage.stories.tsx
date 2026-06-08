import React, { useEffect, useState } from 'react';
import { Meta, StoryFn } from '@storybook/react';
import OrgUsersSubpage from './OrgUsersSubpage';

const meta: Meta = {
  title: 'Pages/Admin/Organization Users',
  component: OrgUsersSubpage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

const StoryApp: React.FC = () => {
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__VITE_API_BASE = 'http://localhost:3001';
    }

    let mounted = true;

    fetch('http://localhost:3001/api/Organizations')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        const firstOrg = Array.isArray(data) ? data[0] : null;
        setOrg(firstOrg ? { id: Number(firstOrg.id), name: String(firstOrg.name ?? 'Organization') } : null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(String(err?.message || err));
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return <div style={{ padding: 24, color: '#ffb4ab' }}>Error: {error}</div>;
  }

  if (!org) {
    return <div style={{ padding: 24, color: '#c1c6d7' }}>Loading organization...</div>;
  }

  return <OrgUsersSubpage org={org} onBack={() => undefined} />;
};

export const Default: StoryFn = () => <StoryApp />;