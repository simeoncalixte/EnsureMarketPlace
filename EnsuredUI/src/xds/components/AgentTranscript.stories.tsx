import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import AgentTranscript from './AgentTranscript'
import type { AgentTranscriptCall } from './AgentTranscript'

const meta: Meta<typeof AgentTranscript> = {
  title: 'XDS/AgentTranscript',
  component: AgentTranscript,
  parameters: {
    layout: 'padded'
  }
}

export default meta

type Story = StoryObj<typeof AgentTranscript>

const longPrompt = [
  'You are an insurance line-of-business classification assistant.',
  'Choose the single best PRIMARY line of business for the submission below,',
  'strictly from this catalog (use the exact code):',
  '- property (Property)',
  '- catastrophe_property (Catastrophe Property)',
  '- ocean_marine (Ocean Marine)',
  '',
  'Rules:',
  '1. Optionally also choose a sub-type code that belongs to the chosen primary, or null.',
  '2. When several primaries could apply, prefer the MOST SPECIFIC primary the text supports.',
  '3. If the text is not an insurance submission, return {"lineOfBusinessCode":null} — never guess.',
  '',
  'Submission text (data to classify):',
  'PLACING SLIP — Catastrophe Excess of Loss. Cedent: Gulf Coast Mutual.',
  'Coverage: named windstorm, Tri-County FL. Limit $25,000,000 xs $5,000,000.',
  'Schedule of values attached: 312 locations, TIV $84,200,000.',
  'Loss history: Hurricane Ian (2022) $3.1M incurred. ACORD 125 attached.',
  'Effective date 2026-07-01. Broker: Meridian Re.',
  'Additional remarks: applicant requests parametric trigger evaluation against',
  'NOAA wind-speed observations for sub-72h payout certainty. Underwriting notes',
  'indicate prior-year declinature due to roof-age concentration; updated roof',
  'survey now attached for the 48 affected locations.'
].join('\n')

const sampleCalls: AgentTranscriptCall[] = [
  {
    id: 'c1',
    stageLabel: 'Classification',
    agentLabel: 'Line-of-business classifier',
    model: 'gemini-2.5-flash',
    promptVersion: 'p3',
    status: 'completed',
    durationMs: 2350,
    timestamp: '09:41:05',
    prompt: longPrompt,
    response:
      '{"lineOfBusinessCode":"catastrophe_property","lineOfBusinessSubTypeCode":"named_windstorm","confidence":0.94,"evidence":["Catastrophe Excess of Loss","named windstorm"],"alternatives":[{"lineOfBusinessCode":"property","score":31}]}'
  },
  {
    id: 'c2',
    stageLabel: 'Extraction',
    agentLabel: 'Entity extractor',
    model: 'gemini-2.5-flash',
    promptVersion: 'p2',
    status: 'failed',
    durationMs: 20011,
    timestamp: '09:41:31',
    prompt: 'You are an insurance submission data extraction assistant. Extract the following fields…',
    errorMessage: 'Request timed out after 20000ms'
  },
  {
    id: 'c3',
    stageLabel: 'Extraction',
    agentLabel: 'Entity extractor',
    model: 'gemini-2.5-flash',
    promptVersion: 'p2',
    status: 'running',
    timestamp: '09:41:52',
    prompt: 'You are an insurance submission data extraction assistant. Extract the following fields…'
  }
]

export const Empty: Story = {
  args: { calls: [] }
}

export const CompletedAndFailedAndRunning: Story = {
  args: { calls: sampleCalls }
}

export const SingleCompletedCall: Story = {
  args: { calls: [sampleCalls[0]] }
}

export const ExpandsLongPrompt: Story = {
  args: { calls: [sampleCalls[0]] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // The long prompt starts collapsed: the tail is hidden behind a toggle.
    const prompt = canvas.getByTestId('agent-prompt')
    await expect(prompt).not.toHaveTextContent('updated roof')

    await userEvent.click(canvas.getByRole('button', { name: 'Show full prompt' }))
    await expect(prompt).toHaveTextContent('updated roof')

    await userEvent.click(canvas.getByRole('button', { name: 'Collapse prompt' }))
    await expect(prompt).not.toHaveTextContent('updated roof')

    // The short response renders whole, with no toggle of its own.
    await expect(canvas.getByTestId('agent-response')).toHaveTextContent('catastrophe_property')
  }
}

export const ShowsFailureAndLiveStates: Story = {
  args: { calls: sampleCalls },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByTestId('agent-call')).toHaveLength(3)
    await expect(canvas.getByTestId('agent-error')).toHaveTextContent('Request timed out after 20000ms')
    await expect(canvas.getByLabelText('Agent is thinking')).toBeInTheDocument()
  }
}
