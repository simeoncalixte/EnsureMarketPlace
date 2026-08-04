import React from 'react';
import styled from 'styled-components';
import StatCard from '../../xds/components/StatCard';
import { colors, withAlpha } from '../../xds/colors';
import { toCompactParts } from './Marketplace.utils';
import { StatsSection, StatCardSurface, StatNoteRow } from './Marketplace.styles';

type Summary = {
  totalOpenCapacity: number;
  totalFunded: number;
  activeDeals: number;
};

type ValueResolver = keyof Summary;
type CardSlot = 1 | 2 | 3;

export type MarketplaceStatsSettings = Record<string, unknown>;

const fallbackCards = [
  { title: 'Total Open Capacity', value: 'totalOpenCapacity', icon: 'trending_up', caption: 'Live Pending Funding Capacity' },
  { title: 'Total Funded', value: 'totalFunded', icon: 'history', caption: 'Funding Already Committed' },
  { title: 'Active Deals', value: 'activeDeals', icon: 'pending_actions', caption: 'Active Opportunities Pending Funding' },
] as const;

const CardEditButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${withAlpha(colors.primary, 0.35)};
  border-radius: 8px;
  background: ${colors.surfaceContainer};
  color: ${colors.primary};
  cursor: pointer;
  & .material-symbols-outlined { font-size: 17px; }
`;

function textSetting(settings: MarketplaceStatsSettings | undefined, key: string, fallback: string): string {
  return typeof settings?.[key] === 'string' ? String(settings[key]) : fallback;
}

function resolverSetting(settings: MarketplaceStatsSettings | undefined, slot: CardSlot): ValueResolver {
  const value = settings?.[`card${slot}Value`];
  return value === 'totalOpenCapacity' || value === 'totalFunded' || value === 'activeDeals'
    ? value
    : fallbackCards[slot - 1].value;
}

export function MarketplaceStatsSection({
  summary,
  settings,
  editing = false,
  onEditCard,
}: {
  summary: Summary;
  settings?: MarketplaceStatsSettings;
  editing?: boolean;
  onEditCard?: (card: CardSlot) => void;
}) {
  const cards = fallbackCards.map((fallback, index) => {
    const slot = (index + 1) as CardSlot;
    const resolver = resolverSetting(settings, slot);
    const rawValue = summary[resolver];
    const monetary = resolver !== 'activeDeals';
    const compact = monetary ? toCompactParts(rawValue) : null;
    return {
      title: textSetting(settings, `card${slot}Title`, fallback.title),
      icon: textSetting(settings, `card${slot}Icon`, fallback.icon),
      caption: textSetting(settings, `card${slot}Caption`, fallback.caption),
      value: compact?.value ?? String(rawValue),
      suffix: compact?.suffix,
      currencyPrefix: monetary ? '$' : undefined,
    };
  });
  const tones = ['primary', 'secondary', 'tertiary'] as const;

  return (
    <StatsSection>
      {cards.map((card, index) => (
        <StatCardSurface key={index} $tone={tones[index]} style={{ position: 'relative' }}>
          {editing && onEditCard ? (
            <CardEditButton
              type="button"
              aria-label={`Edit card ${index + 1} in settings panel`}
              onClick={() => onEditCard((index + 1) as CardSlot)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">edit</span>
            </CardEditButton>
          ) : null}
          <StatCard
            label={card.title}
            currencyPrefix={card.currencyPrefix}
            value={card.value}
            suffix={card.suffix}
            tone={index === 0 ? 'info' : 'default'}
            note={
              <StatNoteRow>
                {card.icon ? <span className="material-symbols-outlined">{card.icon}</span> : null}
                {card.caption}
              </StatNoteRow>
            }
          />
        </StatCardSurface>
      ))}
    </StatsSection>
  );
}
