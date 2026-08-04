import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import WidgetSettingsForm from './WidgetSettingsForm';
import type { SettingsSchema, ResolvedSettings } from './types';

export default { title: 'Dashboards/WidgetSettingsForm', component: WidgetSettingsForm } as Meta<typeof WidgetSettingsForm>;

const Template: StoryFn<typeof WidgetSettingsForm> = (args) => (
  <div style={{ padding: 12, maxWidth: 640 }}><WidgetSettingsForm {...args} /></div>
);

export const EmptySchema = Template.bind({});
EmptySchema.args = {
  widgetTitle: 'Sample widget',
  schema: undefined as unknown as SettingsSchema,
  values: {},
  onChange: (k: string, v: unknown) => console.log('change', k, v),
};

const schema: SettingsSchema = [
  { key: 'titleSuffix', label: 'Title suffix', type: 'text', default: '' },
  { key: 'threshold', label: 'Threshold', type: 'number', default: 10, min: 0, max: 100 },
  { key: 'showDetail', label: 'Show detail', type: 'boolean', default: false },
  { key: 'mode', label: 'Mode', type: 'select', default: 'auto', options: [{ value: 'auto', label: 'Auto' }, { value: 'manual', label: 'Manual' }] },
];

export const WithSchema: StoryFn = () => (
  <Template widgetTitle="Custom Metric" schema={schema} values={{}} onChange={(k, v) => console.log('onChange', k, v)} />
);

export const WithValues: StoryFn = () => (
  <Template widgetTitle="Custom Metric" schema={schema} values={{ threshold: 42, showDetail: true, mode: 'manual', title: 'Overridden' } as ResolvedSettings} onChange={(k, v) => console.log('onChange', k, v)} />
);

export const TitleOnly: StoryFn = () => (
  <Template widgetTitle="KPI" schema={[]} values={{ title: 'Revenue' } as ResolvedSettings} onChange={(k, v) => console.log('title', k, v)} />
);
