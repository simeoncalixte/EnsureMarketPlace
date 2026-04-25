import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import QueueConfig from './QueueConfig';
import RabbitMQConfig from './RabbitMQConfig';

const meta: Meta<typeof QueueConfig> = {
  title: 'Pages/Insurer Dashboard/Queue Config',
  component: QueueConfig,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

function StoryApp() {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }

  return (
    <MemoryRouter initialEntries={['/insurer/pipeline-ingestion/rabbitmq/1', '/insurer/pipeline-ingestion/rabbitmq/1/queue/submissions_inbound']} initialIndex={1}>
      <Routes>
        <Route path="/insurer/pipeline-ingestion/rabbitmq/:channelId" element={<RabbitMQConfig />} />
        <Route path="/insurer/pipeline-ingestion/rabbitmq/:channelId/queue/:queueName" element={<QueueConfig />} />
      </Routes>
    </MemoryRouter>
  );
}

export const Default: Story = {
  render: () => <StoryApp />,
};