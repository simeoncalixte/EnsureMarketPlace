import React from 'react'
import { Meta, StoryFn } from '@storybook/react'
import WebhookConfig from './WebhookConfig'

const meta: Meta = {
  title: 'Pages/Insurer Dashboard/Webhook Config',
  component: WebhookConfig,
  parameters: { layout: 'fullscreen' },
}

export default meta

export const Default: StoryFn = () => <WebhookConfig />
