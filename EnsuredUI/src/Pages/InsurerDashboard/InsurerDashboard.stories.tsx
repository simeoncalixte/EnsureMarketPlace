import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import InsurerDashboard from './InsurerDashboard';
import ClaimsDashboard from '../Claims/ClaimsDashboard';
import InsurerLayout from './InsurerLayout';
import AnalyticsDashboard from './AnalyticsDashboard';
import ActiveCoverage from './ActiveCoverage';
import Reports from './Reports';
import Settings from './Settings';
import { Routes, Route } from 'react-router';
import PipelineIngestion from './PipelineIngestion';
import RabbitMQConfig from './RabbitMQConfig';
import QueueConfig from './QueueConfig';
import EmailIngestConfig from './EmailIngestConfig';
import CloudStorageConfig from './CloudStorageConfig';
import SFTPConfig from './SFTPConfig';
import WebhookConfig from './WebhookConfig';

const meta: Meta = {
  title: 'Pages/Insurer Dashboard',
  component: InsurerDashboard,
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default: StoryFn = () => {
  // Point Storybook at the local API by default for the demo
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }

  // Render a small route set for the story so clicking sidebar links navigates to the claims and coverage pages
  return (
    <Routes>
      <Route path="/" element={<InsurerLayout />}>
        <Route index element={<AnalyticsDashboard />} />
        <Route path="insurer/dashboard" element={<AnalyticsDashboard />} />
        <Route path="insurer/claims" element={<ClaimsDashboard />} />
        <Route path="insurer/coverage/create" element={<InsurerDashboard />} />
        <Route path="insurer/coverage-active" element={<ActiveCoverage />} />
        <Route path="insurer/reports" element={<Reports />} />
        <Route path="insurer/settings" element={<Settings />} />
        <Route path="insurer/pipeline-ingestion" element={<PipelineIngestion />} />
        <Route path="insurer/pipeline-ingestion/rabbitmq" element={<RabbitMQConfig />} />
        <Route path="insurer/pipeline-ingestion/rabbitmq/:channelId" element={<RabbitMQConfig />} />
        <Route path="insurer/pipeline-ingestion/rabbitmq/:channelId/queue/:queueName" element={<QueueConfig />} />
        <Route path="insurer/pipeline-ingestion/email-sso" element={<EmailIngestConfig />} />
        <Route path="insurer/pipeline-ingestion/email-sso/:channelId" element={<EmailIngestConfig />} />
        <Route path="insurer/pipeline-ingestion/cloud-storage" element={<CloudStorageConfig />} />
        <Route path="insurer/pipeline-ingestion/cloud-storage/:channelId" element={<CloudStorageConfig />} />
        <Route path="insurer/pipeline-ingestion/sftp" element={<SFTPConfig />} />
        <Route path="insurer/pipeline-ingestion/sftp/:channelId" element={<SFTPConfig />} />
        <Route path="insurer/pipeline-ingestion/webhooks" element={<WebhookConfig />} />
        <Route path="insurer/pipeline-ingestion/webhooks/:channelId" element={<WebhookConfig />} />
      </Route>
    </Routes>
  );
};


