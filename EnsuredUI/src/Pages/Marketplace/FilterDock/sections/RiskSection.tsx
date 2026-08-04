import React from 'react';
import FilterSection, { DisabledField } from '../FilterSection';
import { colors } from '../../../../xds/colors';

type Props = { active: number };

export default function RiskSection({ active }: Props) {
  return (
    <FilterSection title="Risk" icon="shield" color={colors.dataViz.orange} fieldCount={5} active={active}>
      <DisabledField label="Risk score" kind="range" />
      <DisabledField label="CAT score" kind="range" />
      <DisabledField label="Model version" kind="select" />
      <DisabledField label="Historical claims" kind="minmax" />
      <DisabledField label="Climate score" kind="range" />
    </FilterSection>
  );
}
