import React, { useEffect } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import RabbitMQConfig from './RabbitMQConfig'
import QueueConfig from './QueueConfig'
import { Routes, Route, useNavigate } from 'react-router'
import { reactRouterParameters } from 'storybook-addon-remix-react-router'

const meta: Meta = {
  title: 'Pages/RabbitMQConfig',
  argTypes: {
    locationPath: {
      control: 'text',
      description: 'Initial browser location for the addon router',
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

function useMockFetch() {
  React.useEffect(() => {
    const original = window.fetch.bind(window) as typeof window.fetch
    // simple mocked responses for story interactions
    // note: this is intentionally minimal to keep story self-contained
    // and to allow navigation between the list and queue config view.
    const mockFetch = (async (input: any, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.url
      if (url.includes('/api/ingestion-channels/1/queues') && (!init || init.method === 'GET')) {
        return new Response(JSON.stringify([{ name: 'submissions_inbound', messages: 12, consumers: 2, vhost: '/' }]), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      if (url.endsWith('/api/ingestion-channels/1')) {
        return new Response(JSON.stringify({ id: 1, label: 'Rabbit Demo', meta: 'amqp://localhost', config: { queueNames: ['submissions_inbound'], queueConfigs: { submissions_inbound: { action: 'ingest', persist: true } } } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      if (url.includes('/api/ingestion-channels/1/queues/') && url.endsWith('/config') && init?.method === 'PATCH') {
        return new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      if (url.includes('/api/ingestion-channels/1/queues/create') && init?.method === 'POST') {
        return new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return original(input, init)
    }) as typeof window.fetch

    window.fetch = mockFetch
    return () => { window.fetch = original }
  }, [])
}

function StoryApp() {
  useMockFetch()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail ?? {}
      const ch = detail.channelId
      const q = detail.queueName
      if (ch && q) {
        navigate(`/insurer/pipeline-ingestion/rabbitmq/${ch}/queue/${encodeURIComponent(q)}`)
      }
    }
    window.addEventListener('ensured:openQueueConfig', handler)
    return () => window.removeEventListener('ensured:openQueueConfig', handler)
  }, [navigate])

  return (
    <Routes>
      <Route path="/insurer/pipeline-ingestion/rabbitmq/:channelId" element={<RabbitMQConfig />} />
      <Route path="/insurer/pipeline-ingestion/rabbitmq/:channelId/queue/:queueName" element={<QueueConfig />} />
    </Routes>
  )
}

export const Default: Story = {
  args: {
    locationPath: '/insurer/pipeline-ingestion/rabbitmq/1',
  },
  render: () => <StoryApp />,
  parameters: {
    reactRouter: reactRouterParameters({
      location: {
        path: '/insurer/pipeline-ingestion/rabbitmq/1',
      },
    }),
  },
}

