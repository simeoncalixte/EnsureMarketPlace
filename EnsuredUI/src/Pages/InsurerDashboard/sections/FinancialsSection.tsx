import React from 'react';
import styled from 'styled-components';
import * as S from '../InsurerDashboard.styles';
import NumberInput from '../../../xds/components/NumberInput';

const FieldRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FieldLabel = styled.label`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${S.t.neutral400};
  font-weight: 700;
`;

type Props = {
  isActive: boolean;
  coverageLimit: string;
  attachmentPoint: string;
  exhaustionPoint: string;
  premium: string;
  onSetCoverageLimit: (value: string) => void;
  onSetAttachmentPoint: (value: string) => void;
  onSetExhaustionPoint: (value: string) => void;
  onSetPremium: (value: string) => void;
};

export default function FinancialsSection({
  isActive,
  coverageLimit,
  attachmentPoint,
  exhaustionPoint,
  premium,
  onSetCoverageLimit,
  onSetAttachmentPoint,
  onSetExhaustionPoint,
  onSetPremium,
}: Props) {
  return (
    <S.Section $active={isActive}>
      <S.SectionHeader>
        <S.SectionTitle>01b Financials</S.SectionTitle>
        <S.SectionRule />
      </S.SectionHeader>
      <S.GridTwo>
        <FieldRow>
          <FieldLabel>Coverage Limit</FieldLabel>
          <NumberInput value={coverageLimit} onChange={(event) => onSetCoverageLimit(event.target.value)} />
        </FieldRow>
        <FieldRow>
          <FieldLabel>Attachment Point (Deductible)</FieldLabel>
          <NumberInput value={attachmentPoint} onChange={(event) => onSetAttachmentPoint(event.target.value)} />
        </FieldRow>
        <FieldRow>
          <FieldLabel>Exhaustion Point</FieldLabel>
          <NumberInput value={exhaustionPoint} onChange={(event) => onSetExhaustionPoint(event.target.value)} />
        </FieldRow>
        <FieldRow>
          <FieldLabel>Premium</FieldLabel>
          <NumberInput value={premium} onChange={(event) => onSetPremium(event.target.value)} />
        </FieldRow>
      </S.GridTwo>
    </S.Section>
  );
}
