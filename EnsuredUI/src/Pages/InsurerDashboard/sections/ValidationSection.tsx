import React from 'react';
import styled from 'styled-components';
import * as S from '../InsurerDashboard.styles';
import { colors, withAlpha } from '../../../xds/colors';
import InfoCard from '../../../xds/components/InfoCard';
import StatCard from '../../../xds/components/StatCard';

type ValidationCheck = {
  label: string;
  value: string;
};

type Props = {
  isActive: boolean;
  exposureLoading: boolean;
  liveExposureDisplay: string;
  sourceLabel: string;
  subjectCount: number;
  trancheCount: number;
  sourceTypeLabel: string;
  subjectPreview: string;
  checks: ValidationCheck[];
};

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 1rem;
`;

const WorkflowCard = styled.div`
  background: ${S.t.surfaceLow};
  padding: 20px;
  border-radius: 12px;
  border: 1px solid ${withAlpha(colors.primary, 0.08)};
`;

const CardLabel = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${S.t.neutral400};
  font-weight: 700;
  margin-bottom: 12px;
`;

const ExposureRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
`;

const ExposureCaption = styled.div`
  font-size: 12px;
  color: ${S.t.neutral400};
`;

const ExposureValue = styled.div`
  font-size: 28px;
  font-weight: 800;
  margin-top: 6px;
`;

const SourceLabel = styled.div`
  font-size: 12px;
  color: ${S.t.accent};
  font-weight: 700;
  text-align: right;
`;

const MetricGrid = styled.div`
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
`;

const MetricTile = styled.div`
  background: ${S.t.surfaceRaised};
  padding: 12px;
  border-radius: 8px;
`;

const SubjectPreview = styled.div`
  margin-top: 16px;
  font-size: 12px;
  color: ${S.t.textMuted};
  line-height: 1.6;
`;

const CheckList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CheckRow = styled.div`
  background: ${S.t.surfaceRaised};
  padding: 12px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const CheckLabel = styled.div`
  color: ${S.t.neutral400};
  font-size: 12px;
`;

const CheckValue = styled.div`
  color: ${S.t.text};
  font-size: 12px;
  font-weight: 700;
  text-align: right;
`;

const CalloutSlot = styled.div`
  margin-top: 16px;
`;

export default function ValidationSection({
  isActive,
  exposureLoading,
  liveExposureDisplay,
  sourceLabel,
  subjectCount,
  trancheCount,
  sourceTypeLabel,
  subjectPreview,
  checks,
}: Props) {
  return (
    <S.Section $active={isActive}>
      <S.SectionHeader>
        <S.SectionTitle>04 Validation</S.SectionTitle>
        <S.SectionRule />
      </S.SectionHeader>
      <TwoColGrid>
        <WorkflowCard>
          <CardLabel>Live Exposure Snapshot</CardLabel>
          <ExposureRow>
            <div>
              <ExposureCaption>Current modeled exposure</ExposureCaption>
              <ExposureValue>{exposureLoading ? 'Loading…' : liveExposureDisplay}</ExposureValue>
            </div>
            <SourceLabel>{sourceLabel}</SourceLabel>
          </ExposureRow>
          <MetricGrid>
            <MetricTile>
              <StatCard label="Subjects" value={String(subjectCount)} />
            </MetricTile>
            <MetricTile>
              <StatCard label="Tranches" value={String(trancheCount)} />
            </MetricTile>
            <MetricTile>
              <StatCard label="Source" value={sourceTypeLabel} />
            </MetricTile>
          </MetricGrid>
          <SubjectPreview>{subjectPreview}</SubjectPreview>
        </WorkflowCard>
        <WorkflowCard>
          <CardLabel>Validation Checklist</CardLabel>
          <CheckList>
            {checks.map((check) => (
              <CheckRow key={check.label}>
                <CheckLabel>{check.label}</CheckLabel>
                <CheckValue>{check.value}</CheckValue>
              </CheckRow>
            ))}
          </CheckList>
          <CalloutSlot>
            <InfoCard tone="success">
              Validation is staged here before any submission or signing action is available.
            </InfoCard>
          </CalloutSlot>
        </WorkflowCard>
      </TwoColGrid>
    </S.Section>
  );
}
