import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials', 'storybook-addon-remix-react-router'],
  // Generate a Docs page per component so tools reading index.json (e.g. the
  // storybook MCP server) see type:'docs' entries — see .mcp.json.
  docs: { autodocs: true },
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      optimizeDeps: {
        exclude: ['storybook-addon-remix-react-router'],
      },
    })
  },
}

export default config
