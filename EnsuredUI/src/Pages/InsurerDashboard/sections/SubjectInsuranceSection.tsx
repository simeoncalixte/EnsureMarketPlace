import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import * as S from '../InsurerDashboard.styles';
import Button from '../../../xds/components/Button';
import SegmentedSwitch from '../../../xds/components/SegmentedSwitch';
import CollapsibleSection from '../../../xds/components/CollapsibleSection';
import type { SubjectGroup, SubjectGroupingMode, SubjectTextFieldKey } from '../InsurerDashboard.sectionTypes';
import type { LineOfBusinessPageTemplateField, LineOfBusinessTaxonomyPrimary } from '../lineOfBusinessTaxonomy';
import SubjectInsuranceCard from './SubjectInsuranceCard';

const GroupingSwitch = styled.div`
  min-width: 240px;
`;

const GroupCardList = styled.div`
  display: grid;
  gap: 8px;
`;

const GROUPING_OPTIONS = [
  { label: 'Group by Location', value: 'location' },
  { label: 'Separate', value: 'separate' },
];

export type SubjectInsuranceSectionProps = {
  isActive: boolean;
  subjectGroupingMode: SubjectGroupingMode;
  groupedSubjects: SubjectGroup[];
  organizationId?: number | null;
  taxonomyByPrimaryLabel: Map<string, LineOfBusinessTaxonomyPrimary>;
  lineOfBusinessTaxonomy: LineOfBusinessTaxonomyPrimary[];
  onSetLocationGrouping: () => void;
  onSetSeparateGrouping: () => void;
  onAddSubject: () => void;
  onRemoveSubject: (index: number) => void;
  onUpdateSubject: (index: number, key: SubjectTextFieldKey, value: string) => void;
  onUpdateSubjectPrimaryLineOfBusiness: (index: number, value: string) => void;
  onUpdateSubjectLineOfBusinessSubType: (index: number, value: string) => void;
  onFieldValueChange: (subjectIndex: number, fieldKey: string, value: string) => void;
  onTemplateResolved: (subjectIndex: number, fields: LineOfBusinessPageTemplateField[]) => void;
};

const SubjectInsuranceSection = React.memo(function SubjectInsuranceSection({
  isActive,
  subjectGroupingMode,
  groupedSubjects,
  organizationId,
  taxonomyByPrimaryLabel,
  lineOfBusinessTaxonomy,
  onSetLocationGrouping,
  onSetSeparateGrouping,
  onAddSubject,
  onRemoveSubject,
  onUpdateSubject,
  onUpdateSubjectPrimaryLineOfBusiness,
  onUpdateSubjectLineOfBusinessSubType,
  onFieldValueChange,
  onTemplateResolved,
}: SubjectInsuranceSectionProps) {
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(() => new Set());
  const [collapsedSubjectIds, setCollapsedSubjectIds] = useState<Set<string>>(() => new Set());
  const hasSeededCollapsedGroupKeysRef = useRef(false);
  const hasSeededCollapsedSubjectIdsRef = useRef(false);

  useEffect(() => {
    setCollapsedGroupKeys((current) => {
      if (subjectGroupingMode !== 'location') {
        hasSeededCollapsedGroupKeysRef.current = false;
        return current.size === 0 ? current : new Set();
      }

      const validGroupKeys = new Set(groupedSubjects.map((group) => group.key));

      if (!hasSeededCollapsedGroupKeysRef.current && validGroupKeys.size > 0) {
        hasSeededCollapsedGroupKeysRef.current = true;
        return new Set(validGroupKeys);
      }

      let changed = false;
      const next = new Set<string>();

      current.forEach((groupKey) => {
        if (validGroupKeys.has(groupKey)) {
          next.add(groupKey);
        } else {
          changed = true;
        }
      });

      if (!changed && next.size === current.size) {
        return current;
      }

      return next;
    });
  }, [groupedSubjects, subjectGroupingMode]);

  const toggleGroupCollapsed = useCallback((groupKey: string) => {
    setCollapsedGroupKeys((current) => {
      const next = new Set(current);

      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }

      return next;
    });
  }, []);

  useEffect(() => {
    setCollapsedSubjectIds((current) => {
      const validSubjectIds = new Set(groupedSubjects.flatMap((group) => group.subjects.map(({ subject }) => subject.subjectId)));

      if (!hasSeededCollapsedSubjectIdsRef.current && validSubjectIds.size > 0) {
        hasSeededCollapsedSubjectIdsRef.current = true;
        return new Set(validSubjectIds);
      }

      let changed = false;
      const next = new Set<string>();

      current.forEach((subjectId) => {
        if (validSubjectIds.has(subjectId)) {
          next.add(subjectId);
        } else {
          changed = true;
        }
      });

      if (!changed && next.size === current.size) {
        return current;
      }

      return next;
    });
  }, [groupedSubjects]);

  const toggleSubjectCollapsed = useCallback((subjectId: string) => {
    setCollapsedSubjectIds((current) => {
      const next = new Set(current);

      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }

      return next;
    });
  }, []);

  return (
    <S.Section $active={isActive}>
      <S.SectionHeader>
        <S.SectionTitle>02 Subject of Insurance</S.SectionTitle>
        <S.SectionRule />
        <S.FlexEnd>
          <GroupingSwitch>
            <SegmentedSwitch
              options={GROUPING_OPTIONS}
              value={subjectGroupingMode}
              onChange={(mode: string) => (mode === 'location' ? onSetLocationGrouping() : onSetSeparateGrouping())}
              aria-label="Subject grouping mode"
            />
          </GroupingSwitch>
          <Button type="button" onClick={onAddSubject}>+ Add Subject</Button>
        </S.FlexEnd>
      </S.SectionHeader>
      <S.PreloadedMeta>
        Track each insured object separately, or group them by location. Subjects without location data are grouped under Unknown / Undefined.
      </S.PreloadedMeta>
      <S.SectionGrid>
        {groupedSubjects.map((group) => {
          const isCollapsed = collapsedGroupKeys.has(group.key);

          const cards = group.subjects.map(({ subject, index: idx }) => (
            <SubjectInsuranceCard
              key={subject.subjectId}
              subject={subject}
              subjectIndex={idx}
              organizationId={organizationId}
              isCollapsed={collapsedSubjectIds.has(subject.subjectId)}
              onToggleCollapsed={toggleSubjectCollapsed}
              taxonomyByPrimaryLabel={taxonomyByPrimaryLabel}
              lineOfBusinessTaxonomy={lineOfBusinessTaxonomy}
              onRemoveSubject={onRemoveSubject}
              onUpdateSubject={onUpdateSubject}
              onUpdateSubjectPrimaryLineOfBusiness={onUpdateSubjectPrimaryLineOfBusiness}
              onUpdateSubjectLineOfBusinessSubType={onUpdateSubjectLineOfBusinessSubType}
              onFieldValueChange={onFieldValueChange}
              onTemplateResolved={onTemplateResolved}
            />
          ));

          if (subjectGroupingMode === 'location') {
            return (
              <CollapsibleSection
                key={group.key}
                title={group.label}
                count={group.subjects.length}
                collapsed={isCollapsed}
                onToggle={() => toggleGroupCollapsed(group.key)}
              >
                <GroupCardList>{cards}</GroupCardList>
              </CollapsibleSection>
            );
          }

          return (
            <GroupCardList key={group.key}>
              {cards}
            </GroupCardList>
          );
        })}
      </S.SectionGrid>
    </S.Section>
  );
});

export default SubjectInsuranceSection;
