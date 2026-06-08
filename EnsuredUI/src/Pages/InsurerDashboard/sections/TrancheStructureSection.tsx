import React from 'react';
import styled from 'styled-components';
import * as S from '../InsurerDashboard.styles';
import { colors, withAlpha } from '../../../xds/colors';
import Button from '../../../xds/components/Button';
import NumberInput from '../../../xds/components/NumberInput';
import Checkbox from '../../../xds/components/Checkbox';
import SegmentedSwitch from '../../../xds/components/SegmentedSwitch';
import type { SubjectGroup, SubjectGroupingMode, SubjectInput, TrancheInput, TrancheSubjectSelectionMode } from '../InsurerDashboard.sectionTypes';

const HeaderActions = styled.div`
  margin-left: auto;
`;

const TrancheList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TrancheHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
`;

const FieldLabel = styled.label`
  font-size: 10px;
  text-transform: uppercase;
  color: ${S.t.neutral400};
  font-weight: 700;
`;

const StrongValue = styled.div`
  font-weight: 800;
`;

const SelectionModeSwitch = styled.div`
  min-width: 220px;
`;

const AppliedSection = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${withAlpha(colors.border, 0.12)};
`;

const AppliedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const AppliedLabel = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  color: ${S.t.neutral400};
  font-weight: 700;
`;

const AppliedCount = styled.div<{ $all: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ $all }) => ($all ? S.t.accent : S.t.primary)};
`;

const GroupList = styled.div`
  display: grid;
  gap: 12px;
`;

const Group = styled.div`
  display: grid;
  gap: 8px;
`;

const GroupLabel = styled.div`
  color: ${S.t.neutral400};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
`;

const SubjectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
`;

const SubjectTile = styled.label<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid ${({ $selected }) => ($selected ? withAlpha(colors.accent, 0.28) : withAlpha(colors.border, 0.18))};
  background: ${({ $selected }) => ($selected ? withAlpha(colors.accent, 0.08) : S.t.surfaceLow)};
  cursor: pointer;
`;

const SubjectMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const SubjectName = styled.span`
  color: ${S.t.text};
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SubjectSub = styled.span`
  color: ${S.t.neutral400};
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EmptyNote = styled.div`
  color: ${S.t.neutral400};
  font-size: 12px;
  line-height: 1.6;
`;

const SELECTION_MODE_OPTIONS = [
  { label: 'All Subjects', value: 'all' },
  { label: 'Selective', value: 'selective' },
];

type Props = {
  isActive: boolean;
  tranches: TrancheInput[];
  subjects: SubjectInput[];
  groupedSubjects: SubjectGroup[];
  subjectGroupingMode: SubjectGroupingMode;
  onAddTranche: () => void;
  onUpdateTrancheSubjectSelectionMode: (index: number, mode: TrancheSubjectSelectionMode) => void;
  onUpdateTranche: (index: number, key: keyof TrancheInput, value: string) => void;
  onUpdateTrancheSubjectSelection: (index: number, subjectId: string, checked: boolean) => void;
};

export default function TrancheStructureSection({
  isActive,
  tranches,
  subjects,
  groupedSubjects,
  subjectGroupingMode,
  onAddTranche,
  onUpdateTrancheSubjectSelectionMode,
  onUpdateTranche,
  onUpdateTrancheSubjectSelection,
}: Props) {
  return (
    <S.Section $active={isActive}>
      <S.SectionHeader>
        <S.SectionTitle>03 Tranche Structure</S.SectionTitle>
        <S.SectionRule />
        <HeaderActions>
          <Button type="button" onClick={onAddTranche}>+ Add Tranche</Button>
        </HeaderActions>
      </S.SectionHeader>
      <TrancheList>
        {tranches.map((tranche, trancheIndex) => {
          const selectedSubjectIdSet = new Set(tranche.selectedSubjectIds);

          return (
            <S.TrancheCard key={tranche.trancheId} data-primary={trancheIndex === 0}>
              <TrancheHeaderRow>
                <div>
                  <FieldLabel>Layer Type</FieldLabel>
                  <StrongValue>{tranche.name}</StrongValue>
                </div>
                <SelectionModeSwitch>
                  <SegmentedSwitch
                    options={SELECTION_MODE_OPTIONS}
                    value={tranche.subjectSelectionMode}
                    onChange={(mode: string) => onUpdateTrancheSubjectSelectionMode(trancheIndex, mode as TrancheSubjectSelectionMode)}
                    aria-label="Tranche subject selection mode"
                  />
                </SelectionModeSwitch>
              </TrancheHeaderRow>

              <S.TrancheGrid>
                <div>
                  <FieldLabel>Attachment</FieldLabel>
                  <NumberInput value={tranche.layerMin} onChange={(event) => onUpdateTranche(trancheIndex, 'layerMin', event.target.value)} />
                </div>
                <div>
                  <FieldLabel>Exhaustion</FieldLabel>
                  <NumberInput value={tranche.layerMax} onChange={(event) => onUpdateTranche(trancheIndex, 'layerMax', event.target.value)} />
                </div>
                <div>
                  <FieldLabel>Capacity</FieldLabel>
                  <NumberInput value={tranche.capitalRequired} onChange={(event) => onUpdateTranche(trancheIndex, 'capitalRequired', event.target.value)} />
                </div>
                <div>
                  <FieldLabel>Tranche Status</FieldLabel>
                  <StrongValue>{tranche.subjectSelectionMode === 'all' ? 'All subjects' : `${tranche.selectedSubjectIds.length} selected`}</StrongValue>
                </div>
              </S.TrancheGrid>

              <AppliedSection>
                <AppliedHeader>
                  <AppliedLabel>Applied Subjects</AppliedLabel>
                  <AppliedCount $all={tranche.subjectSelectionMode === 'all'}>
                    {tranche.subjectSelectionMode === 'all' ? `${subjects.length} subjects included` : `${tranche.selectedSubjectIds.length} of ${subjects.length} selected`}
                  </AppliedCount>
                </AppliedHeader>
                {tranche.subjectSelectionMode === 'selective' ? (
                  <GroupList>
                    {groupedSubjects.map((group) => (
                      <Group key={`${tranche.trancheId}-${group.key}`}>
                        {subjectGroupingMode === 'location' ? (
                          <GroupLabel>{group.label}</GroupLabel>
                        ) : null}
                        <SubjectGrid>
                          {group.subjects.map(({ subject }) => {
                            const selected = selectedSubjectIdSet.has(subject.subjectId);

                            return (
                              <SubjectTile key={subject.subjectId} $selected={selected}>
                                <Checkbox
                                  checked={selected}
                                  onChange={(event) => onUpdateTrancheSubjectSelection(trancheIndex, subject.subjectId, event.target.checked)}
                                />
                                <SubjectMeta>
                                  <SubjectName>{subject.subjectLabel}</SubjectName>
                                  <SubjectSub>
                                    {subject.lineOfBusiness || 'No line of business'}{subject.lineOfBusinessSubType ? ` • ${subject.lineOfBusinessSubType}` : ''}
                                  </SubjectSub>
                                </SubjectMeta>
                              </SubjectTile>
                            );
                          })}
                        </SubjectGrid>
                      </Group>
                    ))}
                  </GroupList>
                ) : (
                  <EmptyNote>
                    All subjects of insurance will be applied to this tranche by default.
                  </EmptyNote>
                )}
              </AppliedSection>
            </S.TrancheCard>
          );
        })}
      </TrancheList>
    </S.Section>
  );
}
