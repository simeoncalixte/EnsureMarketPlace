import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import UsersSubpage from './UsersSubpage';
import { saveAuthToken } from '../../lib/auth';

const meta: Meta = {
  title: 'Pages/Admin/Users',
  component: UsersSubpage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Default: StoryFn = () => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
    saveAuthToken(null);
  }

  return <UsersSubpage />;
};

export const SignedIn: StoryFn = () => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
    saveAuthToken('storybook-demo-token');
  }

  return <UsersSubpage />;
};