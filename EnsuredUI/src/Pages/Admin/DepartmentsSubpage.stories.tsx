import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import DepartmentsSubpage from './DepartmentsSubpage';

const meta: Meta = {
  title: 'Pages/Admin/Departments',
  component: DepartmentsSubpage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

const StoryApp: React.FC = () => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }
  return <DepartmentsSubpage org={{ id: 1, name: 'Pinnacle Re Insurance' }} onBack={() => undefined} />;
};

export const Default: StoryFn = () => <StoryApp />;
