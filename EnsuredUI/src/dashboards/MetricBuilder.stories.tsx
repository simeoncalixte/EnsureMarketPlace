import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import MetricBuilder from './MetricBuilder';
import * as api from './api';
import type { MetricDefinition, ModelFieldCatalog } from './metricTypes';

export default { title: 'Dashboards/MetricBuilder', component: MetricBuilder } as Meta<typeof MetricBuilder>;

const sampleBase: MetricDefinition = { terms: [], formula: '', viz: 'kpi', format: 'number' };

const sampleCatalog: ModelFieldCatalog = {
  organizationId: 1,
  models: [
    {
      key: 'm1',
      model: 'Sales',
      table: 'sales',
      fields: [
        { path: 'm1.id', label: 'ID', kind: 'uuid', nullable: false },
        { path: 'm1.amount', label: 'Amount', kind: 'number', nullable: false },
        { path: 'm1.date', label: 'Created At', kind: 'date', nullable: false },
        { path: 'm1.status', label: 'Status', kind: 'text', nullable: false },
      ],
    },
    {
      key: 'm2',
      model: 'Users',
      table: 'users',
      fields: [
        { path: 'm2.id', label: 'User ID', kind: 'uuid', nullable: false },
        { path: 'm2.age', label: 'Age', kind: 'number', nullable: true },
        { path: 'm2.signup', label: 'Signup', kind: 'date', nullable: true },
      ],
    },
  ],
};

const Template: StoryFn<typeof MetricBuilder> = (args) => (
  <div style={{ padding: 12, maxWidth: 720 }}>
    <MetricBuilder {...args} />
  </div>
);

export const Default: StoryFn = () => {
  api.getModelCatalog = async () => sampleCatalog as any;
  return <Template organizationId={1} value={sampleBase} onChange={(d) => console.log('metric change', d)} />;
};

export const Loading: StoryFn = () => {
  // never-resolving promise to show loading state
  api.getModelCatalog = () => new Promise(() => {});
  return <Template organizationId={1} value={sampleBase} onChange={() => {}} />;
};

export const Error: StoryFn = () => {
  api.getModelCatalog = async () => {
    throw new Error('Server error');
  };
  return <Template organizationId={1} value={sampleBase} onChange={() => {}} />;
};

export const WithTerms: StoryFn = () => {
  api.getModelCatalog = async () => sampleCatalog as any;
  const value: MetricDefinition = {
    terms: [{ name: 'A', modelKey: 'm1', fn: 'sum', fieldPath: 'm1.amount' }],
    formula: 'A',
    viz: 'kpi',
    format: 'number',
  };
  return <Template organizationId={1} value={value} onChange={(d) => console.log('value', d)} />;
};

export const Grouped: StoryFn = () => {
  api.getModelCatalog = async () => sampleCatalog as any;
  const value: MetricDefinition = {
    terms: [{ name: 'A', modelKey: 'm1', fn: 'sum', fieldPath: 'm1.amount' }],
    formula: 'A',
    groupBy: { kind: 'time', modelKey: 'm1', fieldPath: 'm1.date', bucket: 'month' },
    viz: 'line',
    format: 'number',
  };
  return <Template organizationId={1} value={value} onChange={(d) => console.log('grouped', d)} />;
};

export const MaxTerms: StoryFn = () => {
  api.getModelCatalog = async () => sampleCatalog as any;
  const names = 'ABCDEFGHIJKL'.split('');
  const terms = names.map((n, i) => ({ name: n, modelKey: 'm1', fn: i % 2 === 0 ? 'count' : 'sum', fieldPath: 'm1.amount' } as any));
  const value: MetricDefinition = { terms, formula: names.join('+'), viz: 'kpi', format: 'number' };
  return <Template organizationId={1} value={value} onChange={(d) => console.log('max terms', d)} />;
};
