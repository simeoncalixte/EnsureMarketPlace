import React, { useState } from 'react';
import {
  FilterSectionHeader,
  FilterSectionHeaderLeft,
  FilterSectionIcon,
  FilterSectionTitle,
  FilterSectionMeta,
  FilterSectionActive,
  FilterSectionBody,
  FilterFieldBlock,
  FilterFieldLabelRow,
  FilterFieldLabel,
  SoonTag,
  DisabledSelect,
  DisabledPairGroup,
  DisabledBox,
  DisabledTrack,
} from '../Marketplace.styles';

type FilterSectionProps = {
  title: string;
  icon: string;
  color: string;
  fieldCount: number;
  active: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function FilterSection({ title, icon, color, fieldCount, active, defaultOpen, children }: FilterSectionProps) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <>
      <FilterSectionHeader type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <FilterSectionHeaderLeft>
          <span className="material-symbols-outlined">{open ? 'expand_more' : 'chevron_right'}</span>
          <FilterSectionIcon $color={color}>
            <span className="material-symbols-outlined">{icon}</span>
          </FilterSectionIcon>
          <FilterSectionTitle>{title}</FilterSectionTitle>
        </FilterSectionHeaderLeft>
        <FilterSectionMeta>
          {fieldCount}
          {active > 0 ? <FilterSectionActive>{active}</FilterSectionActive> : null}
        </FilterSectionMeta>
      </FilterSectionHeader>
      {open ? <FilterSectionBody>{children}</FilterSectionBody> : null}
    </>
  );
}

type DisabledKind = 'select' | 'minmax' | 'range' | 'date';

export function DisabledField({ label, kind }: { label: string; kind: DisabledKind }) {
  return (
    <FilterFieldBlock>
      <FilterFieldLabelRow>
        <FilterFieldLabel>{label}</FilterFieldLabel>
        <SoonTag>Soon</SoonTag>
      </FilterFieldLabelRow>
      {kind === 'select' ? (
        <DisabledSelect>
          Any
          <span className="material-symbols-outlined">expand_more</span>
        </DisabledSelect>
      ) : kind === 'minmax' ? (
        <DisabledPairGroup>
          <DisabledBox>Min</DisabledBox>
          <DisabledBox>Max</DisabledBox>
        </DisabledPairGroup>
      ) : kind === 'date' ? (
        <DisabledPairGroup>
          <DisabledBox>From</DisabledBox>
          <DisabledBox>To</DisabledBox>
        </DisabledPairGroup>
      ) : (
        <DisabledTrack />
      )}
    </FilterFieldBlock>
  );
}

export default FilterSection;
