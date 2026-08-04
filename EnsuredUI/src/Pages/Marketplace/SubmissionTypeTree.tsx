import React, { useState } from 'react';
import {
  SUBMISSION_TYPE_DOMAINS,
  type SubmissionTypeDomain,
} from '../../xds/components/submissionTypes';
import {
  Wrap,
  Head,
  HeadLabel,
  ResetBtn,
  Row,
  Twisty,
  Box,
  Dot,
  Label,
  Count,
  PickerWrap,
  Picker,
  PickerLabel,
  SwatchGrid,
  Swatch,
} from '../../xds/components/SubmissionTypeTreeBase';

/**
 * Nested domain → type tree for the Submissions map layer. Each domain is a
 * collapsible header with a tri-state select-all box; each type is a filter
 * checkbox plus a colour swatch that opens a palette picker. Colours and the
 * type selection are owned by the host (persisted to the user's prefs), so this
 * component is presentational.
 */



export type SubmissionTypeTreeProps = {
  /** Selected type codes (filter). */
  selected: Set<string>;
  onToggleType: (code: string) => void;
  onSetDomainSelected: (codes: string[], selected: boolean) => void;
  /** Resolved code → hex (defaults already merged with user overrides). */
  typeColors: Record<string, string>;
  onSetColor: (code: string, hex: string) => void;
  onResetColors: () => void;
  palette: string[];
};

function domainState(domain: SubmissionTypeDomain, selected: Set<string>): 'all' | 'some' | 'none' {
  const on = domain.types.filter((t) => selected.has(t.code)).length;
  if (on === 0) return 'none';
  if (on === domain.types.length) return 'all';
  return 'some';
}

export function SubmissionTypeTree({
  selected,
  onToggleType,
  onSetDomainSelected,
  typeColors,
  onSetColor,
  onResetColors,
  palette,
}: SubmissionTypeTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  const toggleCollapse = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <Wrap>
      <Head>
        <HeadLabel>Submission type · map</HeadLabel>
        <ResetBtn type="button" onClick={onResetColors}>
          Reset colors
        </ResetBtn>
      </Head>

      {SUBMISSION_TYPE_DOMAINS.map((domain) => {
        const state = domainState(domain, selected);
        const isCollapsed = collapsed.has(domain.key);
        const codes = domain.types.map((t) => t.code);
        const onCount = domain.types.filter((t) => selected.has(t.code)).length;

        return (
          <React.Fragment key={domain.key}>
            <Row>
              <Twisty
                type="button"
                onClick={() => toggleCollapse(domain.key)}
                aria-label={isCollapsed ? `Expand ${domain.label}` : `Collapse ${domain.label}`}
              >
                <span className="material-symbols-outlined">
                  {isCollapsed ? 'chevron_right' : 'expand_more'}
                </span>
              </Twisty>
              <Box
                type="button"
                $state={state}
                onClick={() => onSetDomainSelected(codes, state !== 'all')}
                aria-label={`Toggle ${domain.label}`}
              >
                {state === 'all' ? (
                  <span className="material-symbols-outlined">check</span>
                ) : state === 'some' ? (
                  <span className="material-symbols-outlined">remove</span>
                ) : null}
              </Box>
              <Label $bold>{domain.label}</Label>
              <Count>
                {state === 'all' ? domain.types.length : `${onCount}/${domain.types.length}`}
              </Count>
            </Row>

            {!isCollapsed &&
              domain.types.map((type) => {
                const checked = selected.has(type.code);
                return (
                  <Row key={type.code} $indent $dim={!checked}>
                    <Box
                      type="button"
                      $state={checked ? 'all' : 'none'}
                      onClick={() => onToggleType(type.code)}
                      aria-label={`Toggle ${type.label}`}
                    >
                      {checked ? <span className="material-symbols-outlined">check</span> : null}
                    </Box>
                    <Dot
                      type="button"
                      $color={typeColors[type.code]}
                      onClick={() => setOpenPicker((c) => (c === type.code ? null : type.code))}
                      aria-label={`Change ${type.label} color`}
                    />
                    <Label>{type.label}</Label>
                    <PickerWrap>
                      <Twisty
                        type="button"
                        onClick={() => setOpenPicker((c) => (c === type.code ? null : type.code))}
                        aria-label={`${type.label} color picker`}
                      >
                        <span className="material-symbols-outlined">palette</span>
                      </Twisty>
                      {openPicker === type.code ? (
                        <Picker>
                          <PickerLabel>{type.label} color</PickerLabel>
                          <SwatchGrid>
                            {palette.map((hex) => (
                              <Swatch
                                key={hex}
                                type="button"
                                $color={hex}
                                $active={typeColors[type.code] === hex}
                                onClick={() => {
                                  onSetColor(type.code, hex);
                                  setOpenPicker(null);
                                }}
                                aria-label={`Set ${type.label} to ${hex}`}
                              />
                            ))}
                          </SwatchGrid>
                        </Picker>
                      ) : null}
                    </PickerWrap>
                  </Row>
                );
              })}
          </React.Fragment>
        );
      })}
    </Wrap>
  );
}

export default SubmissionTypeTree;
