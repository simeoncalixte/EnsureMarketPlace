import React from 'react';
import styled from 'styled-components';
import * as S from '../InsurerDashboard.styles';
import { colors, withAlpha } from '../../../xds/colors';
import InfoCard from '../../../xds/components/InfoCard';

type SigningCheck = {
  label: string;
  value: string;
};

type Props = {
  isActive: boolean;
  checks: SigningCheck[];
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

const CardLabel = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${S.t.neutral400};
  font-weight: 700;
  margin-bottom: 12px;
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

const PacketBody = styled.div`
  color: ${S.t.textMuted};
  font-size: 13px;
  line-height: 1.6;
`;

const CalloutSlot = styled.div`
  margin-top: 16px;
`;

export default function SigningSection({ isActive, checks }: Props) {
  return (
    <S.Section $active={isActive}>
      <S.SectionHeader>
        <S.SectionTitle>06 Signing</S.SectionTitle>
        <S.SectionRule />
      </S.SectionHeader>
      <TwoColGrid>
        <WorkflowCard>
          <CardLabel>Required Signers</CardLabel>
          <CheckList>
            {checks.map((check) => (
              <CheckRow key={check.label}>
                <CheckLabel>{check.label}</CheckLabel>
                <CheckValue>{check.value}</CheckValue>
              </CheckRow>
            ))}
          </CheckList>
        </WorkflowCard>
        <WorkflowCard>
          <CardLabel>Signing Packet</CardLabel>
          <PacketBody>
            Finalize the underwriting packet after validation and submission. The live exposure summary remains pinned in the side rail while sign-off is prepared.
          </PacketBody>
          <CalloutSlot>
            <InfoCard tone="info">
              Signing is intentionally separated from submission so the page can pause for review before execution.
            </InfoCard>
          </CalloutSlot>
        </WorkflowCard>
      </TwoColGrid>
    </S.Section>
  );
}
