import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { MarketplaceMapSection } from './MarketplaceMapSection';

const meta: Meta<typeof MarketplaceMapSection> = {
  title: 'Pages/Marketplace/MarketplaceMapSection',
  component: MarketplaceMapSection,
  argTypes: {
    mapPoints: { control: 'object' },
    layerColors: { control: 'object' },
    layers: { control: 'object' },
  },
};

export default meta;

const Template: StoryFn<typeof MarketplaceMapSection> = (args) => (
  <div style={{ width: '100%', height: 320 }}>
    <MarketplaceMapSection {...args} />
  </div>
);

export const Empty = Template.bind({});
Empty.args = {
  mapPoints: [],
  onPointClick: () => {},
  layers: {
    layersEnabled: {},
    onToggleLayer: () => {},
    layerFacets: {},
    onToggleLayerFacet: () => {},
    layerCounts: {},
    is3D: false,
    onToggle3D: () => {},
    onLayerCounts: () => {},
  } as any,
  layerColors: {},
};

export const WithPoints = Template.bind({});
WithPoints.args = {
  mapPoints: [
    { latitude: 37.7749, longitude: -122.4194, label: 'Deal A', id: '1' },
    { latitude: 40.7128, longitude: -74.006, label: 'Deal B', id: '2' },
  ],
  onPointClick: () => {},
  layers: {
    layersEnabled: { submissions: true },
    onToggleLayer: () => {},
    layerFacets: { submissions: [] },
    onToggleLayerFacet: () => {},
    layerCounts: { submissions: 2 },
    is3D: false,
    onToggle3D: () => {},
    onLayerCounts: () => {},
  } as any,
  layerColors: {},
};
