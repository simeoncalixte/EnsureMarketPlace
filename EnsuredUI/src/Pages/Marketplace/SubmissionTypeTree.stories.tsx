import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import SubmissionTypeTree from './SubmissionTypeTree';
import { SUBMISSION_TYPE_DOMAINS } from '../../xds/components/submissionTypes';

const meta: Meta = {
  title: 'Pages/Marketplace/SubmissionTypeTree',
  component: SubmissionTypeTree,
};

export default meta;

function allCodes(): string[] {
  return SUBMISSION_TYPE_DOMAINS.flatMap((d) => d.types.map((t) => t.code));
}

export const NoneSelected: StoryFn = () => (
  <div style={{ width: 420 }}>
    <SubmissionTypeTree
      selected={new Set<string>()}
      onToggleType={action('onToggleType')}
      onSetDomainSelected={action('onSetDomainSelected')}
      typeColors={{}}
      onSetColor={action('onSetColor')}
      onResetColors={action('onResetColors')}
      palette={["#FF8A65", "#4CAF50", "#2196F3"]}
    />
  </div>
);

export const AllSelected: StoryFn = () => (
  <div style={{ width: 420 }}>
    <SubmissionTypeTree
      selected={new Set(allCodes())}
      onToggleType={action('onToggleType')}
      onSetDomainSelected={action('onSetDomainSelected')}
      typeColors={Object.fromEntries(allCodes().map((c, i) => [c, ["#E91E63", "#9C27B0", "#3F51B5"][i % 3]]))}
      onSetColor={action('onSetColor')}
      onResetColors={action('onResetColors')}
      palette={["#E91E63", "#9C27B0", "#3F51B5", "#4CAF50", "#FF9800"]}
    />
  </div>
);

export const SomeSelected: StoryFn = () => {
  const codes = allCodes();
  return (
    <div style={{ width: 420 }}>
      <SubmissionTypeTree
        selected={new Set(codes.slice(0, Math.max(1, Math.floor(codes.length / 3))))}
        onToggleType={action('onToggleType')}
        onSetDomainSelected={action('onSetDomainSelected')}
        typeColors={{ [codes[0]]: '#FF8A65' }}
        onSetColor={action('onSetColor')}
        onResetColors={action('onResetColors')}
        palette={["#FF8A65", "#4CAF50", "#2196F3"]}
      />
    </div>
  );
};
