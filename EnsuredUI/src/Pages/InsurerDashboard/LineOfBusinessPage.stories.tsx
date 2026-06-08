import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { reactRouterParameters } from 'storybook-addon-remix-react-router';
import InsurerLayout from './InsurerLayout';
import LineOfBusinessPage, { LineOfBusinessActiveTemplatePage } from './LineOfBusinessPage';
import InsurerDashboard from './InsurerDashboard';
import AnalyticsDashboard from './AnalyticsDashboard';
import ActiveCoverage from './ActiveCoverage';
import ClaimsDashboard from '../Claims/ClaimsDashboard';
import Reports from './Reports';
import Settings from './Settings';
import PipelineIngestion from './PipelineIngestion';
import PipelineProcesses from './PipelineProcesses';
import RabbitMQConfig from './RabbitMQConfig';
import QueueConfig from './QueueConfig';
import EmailIngestConfig from './EmailIngestConfig';
import CloudStorageConfig from './CloudStorageConfig';
import SFTPConfig from './SFTPConfig';
import WebhookConfig from './WebhookConfig';
const insurerRouting = {
  path: '/',
  element: <InsurerLayout />,
  children: [
    { index: true, element: <AnalyticsDashboard /> },
    { path: 'insurer/dashboard', element: <AnalyticsDashboard /> },
    {
      path: 'insurer/risk',
      children: [
        { index: true, element: <InsurerDashboard /> },
        { path: 'upload', element: <InsurerDashboard /> },
        { path: 'history', element: <InsurerDashboard /> },
        { path: 'validation', element: <InsurerDashboard /> },
      ],
    },
    { path: 'insurer/portfolio', element: <AnalyticsDashboard /> },
    {
      path: 'insurer/coverage',
      children: [
        { index: true, element: <InsurerDashboard /> },
        { path: 'create', element: <InsurerDashboard /> },
        {
          path: 'line-of-business',
          useStoryElement: true,
          children: [{ path: 'active-template', element: <LineOfBusinessActiveTemplatePage /> }],
        },
        { path: 'simulate', element: <InsurerDashboard /> },
        { path: 'pricing', element: <InsurerDashboard /> },
      ],
    },
    { path: 'insurer/coverage-active', element: <ActiveCoverage /> },
    { path: 'insurer/reports', element: <Reports /> },
    { path: 'insurer/pipeline-ingestion', element: <PipelineIngestion /> },
    { path: 'insurer/pipeline-processes', element: <PipelineProcesses /> },
    { path: 'insurer/pipeline-ingestion/rabbitmq', element: <RabbitMQConfig /> },
    { path: 'insurer/pipeline-ingestion/rabbitmq/:channelId', element: <RabbitMQConfig /> },
    { path: 'insurer/pipeline-ingestion/rabbitmq/:channelId/queue/:queueName', element: <QueueConfig /> },
    { path: 'insurer/pipeline-ingestion/email-sso', element: <EmailIngestConfig /> },
    { path: 'insurer/pipeline-ingestion/email-sso/:channelId', element: <EmailIngestConfig /> },
    { path: 'insurer/pipeline-ingestion/cloud-storage', element: <CloudStorageConfig /> },
    { path: 'insurer/pipeline-ingestion/cloud-storage/:channelId', element: <CloudStorageConfig /> },
    { path: 'insurer/pipeline-ingestion/sftp', element: <SFTPConfig /> },
    { path: 'insurer/pipeline-ingestion/sftp/:channelId', element: <SFTPConfig /> },
    { path: 'insurer/pipeline-ingestion/webhooks', element: <WebhookConfig /> },
    { path: 'insurer/pipeline-ingestion/webhooks/:channelId', element: <WebhookConfig /> },
    { path: 'insurer/settings', element: <Settings /> },
    { path: 'insurer/claims', element: <ClaimsDashboard /> },
  ],
};

const meta: Meta = {
  title: 'Pages/Insurer Dashboard/Line of Business Templates',
  component: LineOfBusinessPage,
  parameters: { layout: 'fullscreen' },
};

export default meta;

function StoryApp() {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }

  return <LineOfBusinessPage />;
}

export const Default: StoryFn = () => <StoryApp />;

Default.parameters = {
  reactRouter: reactRouterParameters({
    routing: insurerRouting,
    location: {
      path: '/insurer/coverage/line-of-business',
    },
  }),
};
