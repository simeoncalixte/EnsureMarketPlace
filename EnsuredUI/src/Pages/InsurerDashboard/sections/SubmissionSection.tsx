import React from 'react';
import styled from 'styled-components';
import * as S from '../InsurerDashboard.styles';
import { colors, withAlpha } from '../../../xds/colors';
import Button from '../../../xds/components/Button';
import StatCard from '../../../xds/components/StatCard';

type Props = {
  isActive: boolean;
  liveExposureDisplay: string;
  premiumDisplay: string;
  subjectCount: number;
  trancheCount: number;
  loading: boolean;
  message: string | null;
  onSubmit: () => void;
};

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
  gap: 1rem;
`;

const WorkflowCard = styled.div`
  background: ${S.t.surfaceLow};
  padding: 20px;
  border-radius: 12px;
  border: 1px solid ${withAlpha(colors.primary, 0.08)};
`;

const ActionCard = styled(WorkflowCard)`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CardLabel = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${S.t.neutral400};
  font-weight: 700;
  margin-bottom: 12px;
`;

const ActionLabel = styled(CardLabel)`
  margin-bottom: 0;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
`;

const MetricTile = styled.div`
  background: ${S.t.surfaceRaised};
  padding: 12px;
  border-radius: 8px;
`;

const HelperNote = styled.div`
  margin-top: 16px;
  color: ${S.t.neutral400};
  font-size: 12px;
  line-height: 1.6;
`;

const ActionBody = styled.div`
  color: ${S.t.textMuted};
  font-size: 13px;
  line-height: 1.6;
`;

const ActionFinePrint = styled.div`
  font-size: 10px;
  color: ${S.t.neutral400};
  text-align: center;
`;

const MessageSlot = styled.div`
  margin-top: 4px;
  color: ${S.t.onSurface};
  font-size: 12px;
`;

export default function SubmissionSection({
  isActive,
  liveExposureDisplay,
  premiumDisplay,
  subjectCount,
  trancheCount,
  loading,
  message,
  onSubmit,
}: Props) {
  return (
    <S.Section $active={isActive}>
      <S.SectionHeader>
        <S.SectionTitle>05 Submission</S.SectionTitle>
        <S.SectionRule />
      </S.SectionHeader>
      <TwoColGrid>
        <WorkflowCard>
          <CardLabel>Submission Package</CardLabel>
          <MetricGrid>
            <MetricTile>
              <StatCard label="Live exposure" value={liveExposureDisplay} />
            </MetricTile>
            <MetricTile>
              <StatCard label="Premium" value={premiumDisplay} />
            </MetricTile>
            <MetricTile>
              <StatCard label="Subjects" value={String(subjectCount)} />
            </MetricTile>
            <MetricTile>
              <StatCard label="Tranches" value={String(trancheCount)} />
            </MetricTile>
          </MetricGrid>
          <HelperNote>
            Platform will auto-create an SPV for this deal when needed; you don&apos;t need to supply an SPV ID.
          </HelperNote>
        </WorkflowCard>
        <ActionCard>
          <ActionLabel>Submission Action</ActionLabel>
          <ActionBody>
            Once validation is clear, submit the package to persist the deal, trigger downstream notifications, and prepare the signing workflow.
          </ActionBody>
          <Button type="button" onClick={onSubmit}>{loading ? 'Submitting…' : 'Validate & Submit Deal'}</Button>
          <ActionFinePrint>By submitting, you confirm the TRX-9902 structural integrity matches the attached prospectus.</ActionFinePrint>
          {message ? <MessageSlot>{message}</MessageSlot> : null}
        </ActionCard>
      </TwoColGrid>
    </S.Section>
  );
}
