import React from 'react';
import FilterSection, { DisabledField } from '../FilterSection';
import { FilterFieldBlock, FilterFieldLabel, FilterTwoColGrid } from '../../Marketplace.styles';
import Input from '../../../../xds/components/Input';
import { colors } from '../../../../xds/colors';

type Props = {
  yieldMin: string;
  onYieldMinChange: (value: string) => void;
  yieldMax: string;
  onYieldMaxChange: (value: string) => void;
  active: number;
};

export default function FinancialSection({ yieldMin, onYieldMinChange, yieldMax, onYieldMaxChange, active }: Props) {
  return (
    <FilterSection title="Financial" icon="payments" color={colors.dataViz.green} fieldCount={5} active={active}>
      <DisabledField label="Premium ($ range)" kind="minmax" />
      <FilterFieldBlock>
        <FilterFieldLabel>Yield (%)</FilterFieldLabel>
        <FilterTwoColGrid>
          <Input
            placeholder="Min"
            type="number"
            inputMode="decimal"
            value={yieldMin}
            onChange={(event) => onYieldMinChange(event.target.value)}
            aria-label="Minimum yield"
          />
          <Input
            placeholder="Max"
            type="number"
            inputMode="decimal"
            value={yieldMax}
            onChange={(event) => onYieldMaxChange(event.target.value)}
            aria-label="Maximum yield"
          />
        </FilterTwoColGrid>
      </FilterFieldBlock>
      <DisabledField label="Expected ROI (%)" kind="minmax" />
      <DisabledField label="Brokerage (%)" kind="minmax" />
      <DisabledField label="Loss ratio (%)" kind="minmax" />
    </FilterSection>
  );
}
