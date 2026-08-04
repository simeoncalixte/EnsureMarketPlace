import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect } from '@storybook/test';
import { button, findTarget, play, seeText, type Canvas, type Step } from '../../../test-helpers/play';
import DynamicField from './DynamicField';
import type { SuggestedFormField } from '../../../api/pipeline';

// DynamicField is the single dynamic form-field renderer shared by the
// create-coverage AI sections and the insured-subject cards. These stories pin
// the behavior the unification depends on: AI fields expose a remove ×, base
// (canonical) fields do not, and a repeatable context disables removal.

const field = (over: Partial<SuggestedFormField> = {}): SuggestedFormField => ({
  key: 'occupancy',
  label: 'Occupancy',
  type: 'text',
  order: 1,
  origin: 'ai',
  ...over,
});

/** A self-contained harness so onChange/onRemove have somewhere to land. */
function Harness({
  field: f,
  organizationId,
  repeatable,
  withRemove = true,
}: {
  field: SuggestedFormField;
  organizationId?: number | null;
  repeatable?: boolean;
  withRemove?: boolean;
}) {
  const [value, setValue] = useState('');
  const [removed, setRemoved] = useState(false);
  if (removed) return <div>removed</div>;
  return (
    <DynamicField
      field={f}
      value={value}
      onChange={setValue}
      organizationId={organizationId}
      sectionKey="insured-subject-details"
      repeatable={repeatable}
      onRemoveField={withRemove ? () => setRemoved(true) : undefined}
    />
  );
}

const meta: Meta<typeof Harness> = {
  title: 'Pages/Insurer Dashboard/Sections/Dynamic Field',
  component: Harness,
};
export default meta;

type Story = StoryObj<typeof meta>;

/** Step: assert no element matches the role+name (e.g. the remove ×). */
const notSeeButton = (name: RegExp | string): Step => async (canvas: Canvas) => {
  await expect(canvas.queryByRole('button', { name })).toBeNull();
};

export const AiFieldIsRemovable: Story = {
  args: { field: field() },
  play: play(async (canvas) => {
    // The × is present for an AI field…
    await findTarget(canvas, button(/remove occupancy/i));
  }),
};

export const RemovingHidesTheField: Story = {
  args: { field: field({ label: 'Year Built' }) },
  play: play(
    async (canvas) => {
      const x = await findTarget(canvas, button(/remove year built/i));
      x.click();
    },
    seeText(/removed/i),
  ),
};

export const BaseFieldIsProtected: Story = {
  args: { field: field({ origin: 'base', label: 'City' }) },
  play: play(notSeeButton(/remove/i)),
};

export const RepeatableDisablesRemoval: Story = {
  args: { field: field(), repeatable: true },
  play: play(notSeeButton(/remove/i)),
};
