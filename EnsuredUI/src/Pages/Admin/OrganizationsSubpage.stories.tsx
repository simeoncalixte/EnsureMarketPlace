import React, { useState } from 'react';
import { Meta, StoryFn } from '@storybook/react';
import OrganizationsSubpage from './OrganizationsSubpage';
import OrgUsersSubpage from './OrgUsersSubpage';

const meta: Meta = {
  title: 'Pages/Admin/Organizations',
  component: OrganizationsSubpage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

const StoryApp: React.FC = () => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }

  const [selectedOrg, setSelectedOrg] = useState<{ id: number; name: string } | null>(null);

  if (selectedOrg) {
    return <OrgUsersSubpage org={selectedOrg} onBack={() => setSelectedOrg(null)} />;
  }

  return <OrganizationsSubpage onViewUsers={(org) => setSelectedOrg(org)} />;
};

export const Default: StoryFn = () => <StoryApp />;