import React from 'react';
import styled from 'styled-components';
import * as S from '../InsurerDashboard.styles';
import Input from '../../../xds/components/Input';
import Select from '../../../xds/components/Select';
import Button from '../../../xds/components/Button';
import type { SubjectInput, SubjectTextFieldKey } from '../InsurerDashboard.sectionTypes';
import type { LineOfBusinessPageTemplateField, LineOfBusinessTaxonomyPrimary } from '../lineOfBusinessTaxonomy';
import SubjectTemplateFields from './SubjectTemplateFields';

const FieldLabel = styled.label`
  font-size: 10px;
  text-transform: uppercase;
  color: ${S.t.neutral400};
  font-weight: 700;
`;

const SubjectTitle = styled.div`
  font-weight: 800;
`;

const CardHeader = styled(S.FlexBetween)`
  margin-bottom: 12px;
`;

export type SubjectInsuranceCardProps = {
  subject: SubjectInput;
  subjectIndex: number;
  organizationId?: number | null;
  isCollapsed: boolean;
  onToggleCollapsed: (subjectId: string) => void;
  taxonomyByPrimaryLabel: Map<string, LineOfBusinessTaxonomyPrimary>;
  lineOfBusinessTaxonomy: LineOfBusinessTaxonomyPrimary[];
  onRemoveSubject: (index: number) => void;
  onUpdateSubject: (index: number, key: SubjectTextFieldKey, value: string) => void;
  onUpdateSubjectPrimaryLineOfBusiness: (index: number, value: string) => void;
  onUpdateSubjectLineOfBusinessSubType: (index: number, value: string) => void;
  onFieldValueChange: (subjectIndex: number, fieldKey: string, value: string) => void;
  onTemplateResolved: (subjectIndex: number, fields: LineOfBusinessPageTemplateField[]) => void;
  onRemoveSubjectField?: (subjectIndex: number, sectionKey: string, field: LineOfBusinessPageTemplateField) => void;
};

const SubjectInsuranceCard = React.memo(function SubjectInsuranceCard({
  subject,
  subjectIndex,
  organizationId,
  isCollapsed,
  onToggleCollapsed,
  taxonomyByPrimaryLabel,
  lineOfBusinessTaxonomy,
  onRemoveSubject,
  onUpdateSubject,
  onUpdateSubjectPrimaryLineOfBusiness,
  onUpdateSubjectLineOfBusinessSubType,
  onFieldValueChange,
  onTemplateResolved,
  onRemoveSubjectField,
}: SubjectInsuranceCardProps) {
  const availableSubTypes = taxonomyByPrimaryLabel.get(subject.lineOfBusiness)?.subTypes ?? [];

  return (
    <S.TrancheCard data-kind="subject" data-primary={subjectIndex === 0}>
      <CardHeader>
        <div>
          <S.FormFieldLabel>Subject {subjectIndex + 1}</S.FormFieldLabel>
          <SubjectTitle>{subject.subjectLabel || `Subject ${subjectIndex + 1}`}</SubjectTitle>
        </div>
        <S.FlexEnd>
          <S.SectionCollapseButton type="button" onClick={() => onToggleCollapsed(subject.subjectId)}>
            {isCollapsed ? 'Expand' : 'Collapse'}
          </S.SectionCollapseButton>
          <Button type="button" onClick={() => onRemoveSubject(subjectIndex)}>Remove</Button>
        </S.FlexEnd>
      </CardHeader>
      {!isCollapsed ? (
        <>
      <S.GridAuto>
        <div>
          <FieldLabel>Subject Label</FieldLabel>
          <Input value={subject.subjectLabel} onChange={(e) => onUpdateSubject(subjectIndex, 'subjectLabel', e.target.value)} />
        </div>
        <div>
          <FieldLabel>Line of Business</FieldLabel>
          <Select value={subject.lineOfBusiness} onChange={(e) => onUpdateSubjectPrimaryLineOfBusiness(subjectIndex, e.target.value)}>
            <option value="">Select primary line of business</option>
            {lineOfBusinessTaxonomy.map((option) => (
              <option key={option.code} value={option.label}>{option.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel>Line of Business Subtype</FieldLabel>
          <Select
            value={subject.lineOfBusinessSubType}
            onChange={(e) => onUpdateSubjectLineOfBusinessSubType(subjectIndex, e.target.value)}
            disabled={!subject.lineOfBusiness}
          >
            <option value="">Select subtype</option>
            {availableSubTypes.map((subType) => (
              <option key={subType.code} value={subType.label}>{subType.label}</option>
            ))}
          </Select>
        </div>
      </S.GridAuto>
      <SubjectTemplateFields
        subject={subject}
        subjectIndex={subjectIndex}
        organizationId={organizationId}
        taxonomy={lineOfBusinessTaxonomy}
        onFieldValueChange={onFieldValueChange}
        onTemplateResolved={onTemplateResolved}
        onRemoveField={onRemoveSubjectField}
      />
        </>
      ) : null}
    </S.TrancheCard>
  );
});

export default SubjectInsuranceCard;
