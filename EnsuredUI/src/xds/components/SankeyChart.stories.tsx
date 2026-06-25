import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import SankeyChart, { type SankeyChartLink, type SankeyChartNode } from './SankeyChart';

const meta: Meta<typeof SankeyChart> = {
  title: 'XDS/Charts/Sankey Chart',
  component: SankeyChart,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof SankeyChart>;

// A complete-pipeline flow: the shared prefix (ingestion → ocr → submissionType)
// forks at submissionType into the new-business path (→ classification) and the
// claim/cancellation path (→ extraction).
const NODES: SankeyChartNode[] = [
  { key: 'ingestion', label: 'Ingestion', accent: '#4edea3' },
  { key: 'ocr', label: 'OCR', accent: '#4b8eff' },
  { key: 'submissionType', label: 'Submission Type', accent: '#93c5fd' },
  { key: 'classification', label: 'Line of Business', accent: '#adc6ff' },
  { key: 'extraction', label: 'Extraction', accent: '#7dd3fc' },
  { key: 'locationDiscovery', label: 'Location Discovery', accent: '#5eead4' },
  { key: 'normalization', label: 'Normalization', accent: '#a7f3d0' },
  { key: 'validation', label: 'Validation', accent: '#fbbf24' },
  { key: 'workflow', label: 'Rating & Workflow', accent: '#c084fc' },
  { key: 'riskCompute', label: 'Pricing', accent: '#f472b6' },
  { key: 'preBindCompliance', label: 'Pre-bind Compliance', accent: '#f87171' },
];

const I = Object.fromEntries(NODES.map((node, index) => [node.key, index])) as Record<string, number>;

// Flow-conserved (in = out at every interior node) so the demo reads cleanly:
// the fork is the two links leaving Submission Type.
const LINKS: SankeyChartLink[] = [
  { source: I.ingestion, target: I.ocr, value: 100 },
  { source: I.ocr, target: I.submissionType, value: 100 },
  { source: I.submissionType, target: I.classification, value: 60 }, // new business / quote / renewal / fac
  { source: I.submissionType, target: I.extraction, value: 40 }, // claim / cancellation / treaty / audit
  { source: I.classification, target: I.extraction, value: 60 },
  { source: I.extraction, target: I.locationDiscovery, value: 70 },
  { source: I.extraction, target: I.normalization, value: 30 },
  { source: I.locationDiscovery, target: I.normalization, value: 70 },
  { source: I.normalization, target: I.validation, value: 100 },
  { source: I.validation, target: I.workflow, value: 100 },
  { source: I.workflow, target: I.riskCompute, value: 100 },
  { source: I.riskCompute, target: I.preBindCompliance, value: 100 },
];

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ minHeight: '100vh', background: '#0b1326', color: '#dae2fd', padding: '2rem' }}>
    <div style={{ width: '100%' }}>{children}</div>
  </div>
);

export const Default: Story = {
  render: () => (
    <Frame>
      <SankeyChart nodes={NODES} links={LINKS} height={520} />
    </Frame>
  ),
};

// Deterministic interaction test: the empty state renders without a chart, so it
// does not depend on ResponsiveContainer measuring a real layout.
export const Empty: Story = {
  render: () => (
    <Frame>
      <SankeyChart nodes={[]} links={[]} />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No pipeline flow yet')).toBeInTheDocument();
  },
};
