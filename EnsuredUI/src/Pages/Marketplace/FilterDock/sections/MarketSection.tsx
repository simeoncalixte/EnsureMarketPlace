import React from 'react';
import FilterSection, { DisabledField } from '../FilterSection';
import { colors } from '../../../../xds/colors';
import { FilterFieldBlock } from '../../Marketplace.styles';

type Props = {
  typeSection?: React.ReactNode;
  active: number;
};

export default function MarketSection({ typeSection, active }: Props) {
  return (
    <FilterSection title="Market" icon="account_balance" color={colors.dataViz.purple} fieldCount={5} active={active}>
      <DisabledField label="Broker" kind="select" />
      <DisabledField label="Carrier" kind="select" />
      <DisabledField label="Submission status" kind="select" />
      {typeSection ? <FilterFieldBlock>{typeSection}</FilterFieldBlock> : <DisabledField label="Renewal / new" kind="select" />}
      <DisabledField label="Market appetite" kind="select" />
    </FilterSection>
  );
}
