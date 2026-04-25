// Replace your-framework with the framework you are using, e.g. react-vite, nextjs, vue3-vite, etc.
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
console.log(import.meta.env.STORYBOOK_MAPBOX_TOKEN)
type Props = {
  propertyA?: string | null
  propertyB?: string | null
}

export const EnvVarsDisplay: React.FC<Props> = ({ propertyA, propertyB }) => {
  console.log()
  console.log('Env vars from args:', { propertyA, propertyB })
  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h3>Env Vars (from args)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: 8, fontWeight: 600 }}>propertyA</td>
            <td style={{ padding: 8 }}>{String(import.meta.env.STORYBOOK_MAPBOX_TOKEN ?? '')}</td>
          </tr>
          <tr>
            <td style={{ padding: 8, fontWeight: 600 }}>propertyB</td>
            <td style={{ padding: 8 }}>{String(propertyB ?? '')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

const meta = {
  title: 'XDS/Env Vars',
  component: EnvVarsDisplay,
} satisfies Meta<typeof EnvVarsDisplay>

export default meta
type Story = StoryObj<typeof meta>

export const ExampleStory: Story = {
  args: {
    propertyA: import.meta.env.STORYBOOK_MAPBOX_TOKEN ?? null,
    propertyB: (import.meta as any).env?.VITE_CUSTOM_VAR ?? null,
  },
}
