import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import PipelineProcesses, { type PipelineBoardResponse } from './PipelineProcesses';

const meta: Meta<typeof PipelineProcesses> = {
  title: 'Pages/Insurer Dashboard/Pipeline Processes',
  component: PipelineProcesses,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof PipelineProcesses>;

// --- Mock board data (mirrors GET /api/pipeline/processes/board) -------------
// Storybook has no backend/MSW in this repo, so stories inject the board via the
// component's `boardOverride` prop.

type StageSeed = { key: string; label: string; accent: string };

const STAGE_SEEDS: StageSeed[] = [
  { key: 'ingestion', label: 'Ingestion', accent: '#4edea3' },
  { key: 'ocr', label: 'OCR', accent: '#4b8eff' },
  { key: 'classification', label: 'Classification', accent: '#adc6ff' },
  { key: 'extraction', label: 'Extraction', accent: '#7dd3fc' },
  { key: 'normalization', label: 'Normalization', accent: '#a7f3d0' },
  { key: 'validation', label: 'Validation', accent: '#fbbf24' },
  { key: 'workflow', label: 'Rating & Workflow', accent: '#c084fc' },
];

const stages = STAGE_SEEDS.map((seed) => ({
  key: seed.key,
  label: seed.label,
  accent: seed.accent,
  background: `${seed.accent}1f`,
  border: `${seed.accent}47`,
  description: `${seed.label} stage of the document pipeline.`,
  emptyState: `No submissions in ${seed.label.toLowerCase()}.`,
}));

const stageByKey = new Map(stages.map((stage) => [stage.key, stage]));

type ItemSeed = {
  id: number;
  stageKey: string;
  status: string;
  eventStatus: 'ok' | 'processing' | 'failed';
  priority: 'urgent' | 'high' | 'normal';
  cedent: string;
  lineOfBusiness: string;
  region: string;
  source: string;
  owner: string;
  fileCount: number;
  receivedLabel: string;
  lastEventLabel: string;
  premium: number;
  exposure: number;
  errorMessage?: string;
};

const ITEM_SEEDS: ItemSeed[] = [
  { id: 1, stageKey: 'ingestion', status: 'submitted', eventStatus: 'ok', priority: 'normal', cedent: 'Northwind Specialty', lineOfBusiness: 'Property Cat', region: 'Gulf Coast', source: 'Email SSO', owner: 'Maya Chen', fileCount: 3, receivedLabel: '12 min ago', lastEventLabel: 'No pipeline events yet', premium: 12800000, exposure: 250000000 },
  { id: 2, stageKey: 'ingestion', status: 'submitted', eventStatus: 'processing', priority: 'urgent', cedent: 'BluePeak Re', lineOfBusiness: 'Cyber', region: 'Global', source: 'RabbitMQ', owner: 'Elena Garcia', fileCount: 1, receivedLabel: '20 min ago', lastEventLabel: '2 min ago', premium: 15000000, exposure: 95000000 },
  { id: 3, stageKey: 'ocr', status: 'submitted', eventStatus: 'processing', priority: 'high', cedent: 'Cobalt Marine', lineOfBusiness: 'Marine Cargo', region: 'APAC', source: 'SFTP', owner: 'Ishan Patel', fileCount: 5, receivedLabel: '31 min ago', lastEventLabel: '5 min ago', premium: 5400000, exposure: 78000000 },
  { id: 4, stageKey: 'classification', status: 'submitted', eventStatus: 'ok', priority: 'normal', cedent: 'Aster Logistics', lineOfBusiness: 'Trade Credit', region: 'North America', source: 'Cloud Storage', owner: 'Renee Brooks', fileCount: 2, receivedLabel: '43 min ago', lastEventLabel: '8 min ago', premium: 7600000, exposure: 140000000 },
  { id: 5, stageKey: 'extraction', status: 'submitted', eventStatus: 'ok', priority: 'normal', cedent: 'Helio Renewables', lineOfBusiness: 'Construction All Risk', region: 'EMEA', source: 'Email SSO', owner: 'Mira Tan', fileCount: 4, receivedLabel: '1h ago', lastEventLabel: '22 min ago', premium: 4100000, exposure: 62000000 },
  { id: 6, stageKey: 'normalization', status: 'modeling', eventStatus: 'ok', priority: 'high', cedent: 'Harbor Infrastructure', lineOfBusiness: 'Public Entity', region: 'North America', source: 'API Upload', owner: 'Samir Desai', fileCount: 6, receivedLabel: '2h ago', lastEventLabel: '40 min ago', premium: 6800000, exposure: 115000000 },
  { id: 7, stageKey: 'validation', status: 'modeling', eventStatus: 'failed', priority: 'urgent', cedent: 'Sable Energy', lineOfBusiness: 'Energy Liability', region: 'LatAm', source: 'RabbitMQ', owner: 'Noah Singh', fileCount: 2, receivedLabel: '3h ago', lastEventLabel: '12 min ago', premium: 9200000, exposure: 185000000, errorMessage: 'Schema validation failed: missing TIV on 2 exposure rows.' },
  { id: 8, stageKey: 'workflow', status: 'priced', eventStatus: 'ok', priority: 'normal', cedent: 'Aurora Health', lineOfBusiness: 'Professional Liability', region: 'EMEA', source: 'Portal', owner: 'Talia Reed', fileCount: 3, receivedLabel: '6h ago', lastEventLabel: '1h ago', premium: 3200000, exposure: 49000000 },
];

function buildItems() {
  return ITEM_SEEDS.map((seed) => {
    const stage = stageByKey.get(seed.stageKey)!;
    return {
      id: seed.id,
      stageKey: stage.key,
      stageLabel: stage.label,
      stageAccent: stage.accent,
      stageBackground: stage.background,
      stageBorder: stage.border,
      status: seed.status,
      eventStatus: seed.eventStatus,
      hasError: seed.eventStatus === 'failed',
      priority: seed.priority,
      values: {
        submissionNumber: `SUB-${String(seed.id).padStart(4, '0')}`,
        submissionId: seed.id,
        cedent: seed.cedent,
        lineOfBusiness: seed.lineOfBusiness,
        region: seed.region,
        source: seed.source,
        owner: seed.owner,
        fileCount: seed.fileCount,
        status: seed.status,
        stageLabel: stage.label,
        eventStatus: seed.eventStatus,
        lastEventLabel: seed.lastEventLabel,
        receivedLabel: seed.receivedLabel,
        errorMessage: seed.errorMessage ?? null,
        premium: seed.premium,
        exposure: seed.exposure,
      },
    };
  });
}

function buildBoard(): PipelineBoardResponse {
  const items = buildItems();
  const failed = items.filter((item) => item.eventStatus === 'failed').length;
  const inProcessing = items.filter((item) => item.stageKey !== 'workflow').length;
  const totalPremium = items.reduce((sum, item) => sum + Number(item.values.premium ?? 0), 0);

  return {
    config: {
      eyebrow: 'Pipeline monitor',
      title: 'Pipeline Processes',
      description: 'Active submissions across each stage of the ingestion pipeline.',
      stages,
    },
    availableStages: stages,
    summary: [
      { label: 'Active submissions', value: items.length, meta: 'Submissions currently moving through the pipeline.', format: 'number' },
      { label: 'In processing', value: inProcessing, meta: 'Not yet at the rating & workflow stage.', format: 'number' },
      { label: 'Needs attention', value: failed, meta: 'Submissions whose latest pipeline event failed.', format: 'number' },
      { label: 'Pipeline premium', value: totalPremium, meta: 'Total premium represented across active submissions.', format: 'currency' },
    ],
    channels: { active: 3, total: 5 },
    items,
    refreshedAt: '2026-05-31T14:00:00.000Z',
  };
}

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ minHeight: '100vh', background: '#0b1326', color: '#dae2fd', padding: '2rem' }}>{children}</div>
);

export const Default: Story = {
  render: () => (
    <Frame>
      <PipelineProcesses boardOverride={buildBoard()} />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Each submission card is a keyboard-focusable button that opens Create Coverage.
    const openTargets = canvas.getAllByTitle(/Open .* in Create Coverage/i);
    await expect(openTargets.length).toBeGreaterThan(0);
    await expect(openTargets[0]).toHaveAttribute('role', 'button');
    await expect(openTargets[0]).toHaveAttribute('tabindex', '0');
  },
};

export const Empty: Story = {
  render: () => (
    <Frame>
      <PipelineProcesses boardOverride={{ ...buildBoard(), items: [], summary: buildBoard().summary.map((card) => ({ ...card, value: 0 })) }} />
    </Frame>
  ),
};

export const Loading: Story = {
  render: () => (
    <Frame>
      <PipelineProcesses loadingOverride />
    </Frame>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <Frame>
      <PipelineProcesses errorOverride="Status 500" />
    </Frame>
  ),
};

// Opens straight into the "subscribe to processes" view reached via the stages
// config gear. The process list comes from the board config; the subscription
// state is fetched live (and degrades gracefully when unauthenticated).
export const ProcessSubscriptions: Story = {
  render: () => (
    <Frame>
      <PipelineProcesses boardOverride={buildBoard()} initialView="subscriptions" />
    </Frame>
  ),
};

// Board filtered to the stages the organization subscribed to (the backend only
// returns subscribed lanes; here we mock a 3-stage subscription).
export const SubscribedSubset: Story = {
  render: () => {
    const full = buildBoard();
    const keep = new Set(['ingestion', 'classification', 'validation']);
    const stages = full.config.stages.filter((stage) => keep.has(stage.key));
    const items = full.items.filter((item) => keep.has(item.stageKey));
    return (
      <Frame>
        <PipelineProcesses boardOverride={{ ...full, config: { ...full.config, stages }, items }} />
      </Frame>
    );
  },
};

// Organization has subscribed to nothing → no lanes, with a prompt to subscribe.
export const NoSubscribedProcesses: Story = {
  render: () => {
    const full = buildBoard();
    return (
      <Frame>
        <PipelineProcesses
          boardOverride={{
            ...full,
            config: { ...full.config, stages: [] },
            items: [],
            summary: full.summary.map((card) => ({ ...card, value: 0 })),
          }}
        />
      </Frame>
    );
  },
};
