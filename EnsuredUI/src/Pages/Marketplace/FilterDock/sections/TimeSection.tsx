import React from 'react';
import FilterSection from '../FilterSection';
import Range from '../../../../xds/components/Range';
import { colors } from '../../../../xds/colors';
import { FilterFieldBlock, FilterFieldLabel, RangeLabels } from '../../Marketplace.styles';
import { DURATION_MONTHS_MAX, DURATION_MONTHS_MIN } from '../../useMarketplaceFilters';

type Props = {
  maxDurationMonths: number;
  onMaxDurationChange: (months: number) => void;
  active: number;
};

export default function TimeSection({ maxDurationMonths, onMaxDurationChange, active }: Props) {
  return (
    <FilterSection title="Time" icon="calendar_month" color={colors.dataViz.blueSky} fieldCount={5} active={active}>
      <FilterFieldBlock>
        <FilterFieldLabel>
          Max term · {maxDurationMonths >= DURATION_MONTHS_MAX ? 'Any' : `${maxDurationMonths}M`}
        </FilterFieldLabel>
        <Range
          min={DURATION_MONTHS_MIN}
          max={DURATION_MONTHS_MAX}
          step={1}
          value={maxDurationMonths}
          onChange={(event) => onMaxDurationChange(Number(event.target.value))}
          aria-label="Maximum term in months"
        />
        <RangeLabels>
          <span>3M</span>
          <span>12M</span>
          <span>24M</span>
          <span>36M</span>
        </RangeLabels>
      </FilterFieldBlock>
    </FilterSection>
  );
}
