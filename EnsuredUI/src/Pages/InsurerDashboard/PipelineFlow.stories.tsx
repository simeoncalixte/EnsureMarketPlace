import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import PipelineFlow, { type PipelineFlowResponse } from './PipelineFlow';

const meta: Meta<typeof PipelineFlow> = {
  title: 'Pages/Insurer Dashboard/Pipeline Flow',
  component: PipelineFlow,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof PipelineFlow>;

// Mirrors GET /api/pipeline/processes/flow. Storybook has no backend/MSW, so the
// flow is injected via the component's `flowOverride` prop.
const GREEN = '#4ade80';
const ORANGE = '#f97316';

function buildFlow(): PipelineFlowResponse {
  // Shared trunk, then two type lanes that DON'T re-merge: new business runs to
  // compliance; the claim lane ends at normalization.
  const nodes = [
    { key: 'ingestion', label: 'Ingestion', accent: '#4edea3', type: null, showValue: true },
    { key: 'ocr', label: 'OCR', accent: '#4b8eff', type: null, showValue: true },
    { key: 'submissionType', label: 'Submission Type', accent: '#93c5fd', type: null, showValue: true },
    { key: 'new_business::classification', label: 'Line of Business', accent: GREEN, type: 'new_business', showValue: false },
    { key: 'new_business::extraction', label: 'Extraction', accent: GREEN, type: 'new_business', showValue: false },
    { key: 'new_business::normalization', label: 'Normalization', accent: GREEN, type: 'new_business', showValue: false },
    { key: 'new_business::validation', label: 'Validation', accent: GREEN, type: 'new_business', showValue: false },
    { key: 'new_business::preBindCompliance', label: 'Pre-bind Compliance', accent: GREEN, type: 'new_business', showValue: false },
    { key: 'claim::extraction', label: 'Extraction', accent: ORANGE, type: 'claim', showValue: false },
    { key: 'claim::normalization', label: 'Normalization', accent: ORANGE, type: 'claim', showValue: false },
  ];
  const i = Object.fromEntries(nodes.map((n, index) => [n.key, index])) as Record<string, number>;
  return {
    config: {
      eyebrow: 'Pipeline monitor',
      title: 'Pipeline Flow',
      description: 'After Submission Type the flow splits into one coloured lane per submission type — each runs only the stages on its route.',
    },
    nodes,
    links: [
      { source: i.ingestion, target: i.ocr, value: 80 },
      { source: i.ocr, target: i.submissionType, value: 80 },
      { source: i.submissionType, target: i['new_business::classification'], value: 50 },
      { source: i.submissionType, target: i['claim::extraction'], value: 30 },
      { source: i['new_business::classification'], target: i['new_business::extraction'], value: 50 },
      { source: i['new_business::extraction'], target: i['new_business::normalization'], value: 50 },
      { source: i['new_business::normalization'], target: i['new_business::validation'], value: 50 },
      { source: i['new_business::validation'], target: i['new_business::preBindCompliance'], value: 50 },
      { source: i['claim::extraction'], target: i['claim::normalization'], value: 30 },
    ],
    legend: [
      { code: 'new_business', label: 'New Business', color: GREEN },
      { code: 'claim', label: 'Claims', color: ORANGE },
    ],
    summary: [
      { label: 'Submissions tracked', value: 80, meta: 'Submissions with pipeline history in this org.', format: 'number' },
      { label: 'Stage transitions', value: 450, meta: 'Total forward stage moves across all submissions.', format: 'number' },
      { label: 'Reached final stage', value: 25, meta: 'Submissions that flowed through to the last stage.', format: 'number' },
      { label: 'Latest event failed', value: 4, meta: 'Submissions whose most recent stage failed.', format: 'number' },
    ],
    refreshedAt: '2026-06-23T12:00:00.000Z',
  };
}

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ minHeight: '100vh', background: '#0b1326', color: '#dae2fd', padding: '2rem' }}>{children}</div>
);

export const Default: Story = {
  render: () => (
    <Frame>
      <PipelineFlow flowOverride={buildFlow()} />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Page title, a summary metric, and the type legend render deterministically
    // (no chart layout needed).
    await expect(canvas.getByText('Pipeline Flow')).toBeInTheDocument();
    await expect(canvas.getByText('Submissions tracked')).toBeInTheDocument();
    await expect(canvas.getByText('Stage transitions')).toBeInTheDocument();
    // Submission-type legend (the variation we added).
    await expect(canvas.getByText('New Business')).toBeInTheDocument();
    await expect(canvas.getByText('Claims')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  render: () => (
    <Frame>
      <PipelineFlow loadingOverride />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Connecting to the pipeline flow service/i)).toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  render: () => (
    <Frame>
      <PipelineFlow errorOverride="Status 500" />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/could not be loaded/i)).toBeInTheDocument();
  },
};
