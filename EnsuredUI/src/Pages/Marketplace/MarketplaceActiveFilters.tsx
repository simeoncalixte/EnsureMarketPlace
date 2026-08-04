import React from 'react';
import { ActiveChipsRow, FilterChip, ChipClearAll } from './Marketplace.styles';

export type ActiveFilterChip = {
  key: string;
  label: string;
  accent?: boolean;
  onRemove: () => void;
};

export function MarketplaceActiveFilters({
  chips,
  onClearAll,
}: {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
}) {
  if (chips.length === 0) {
    return null;
  }
  return (
    <ActiveChipsRow>
      {chips.map((chip) => (
        <FilterChip
          key={chip.key}
          type="button"
          $accent={chip.accent}
          onClick={chip.onRemove}
          aria-label={`Remove filter ${chip.label}`}
        >
          {chip.label}
          <span className="material-symbols-outlined">close</span>
        </FilterChip>
      ))}
      <ChipClearAll type="button" onClick={onClearAll}>
        Clear all
      </ChipClearAll>
    </ActiveChipsRow>
  );
}

export default MarketplaceActiveFilters;
