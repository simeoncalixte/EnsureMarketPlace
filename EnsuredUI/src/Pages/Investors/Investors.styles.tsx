import styled from 'styled-components';
import { colors } from '../../xds/colors';
import { spacing, radii, typography } from '../../xds/tokens';
import { PageSubtitle } from '../../xds/components/Typography';

export const TightSubtitle = styled(PageSubtitle)`
  margin: 0;
`;

export const PageWrapper = styled.div`
  font-family: ${typography.fontFamily};
  color: ${colors.text.primary};
  background: ${colors.background};
`;

export const Main = styled.main`
  width: 100%;
  padding: 0;
  min-height: auto;
`;

export const HeaderRow = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: ${spacing.md}px;
  margin-bottom: ${spacing.md}px;
`;

export const HeaderActions = styled.div`
  display: flex;
  gap: ${spacing.sm}px;
`;

export const Card = styled.section`
  background: ${colors.surfaceContainerHigh};
  border-radius: ${radii.md}px;
  border: 1px solid ${colors.outlineVariant};
  overflow: hidden;
`;

export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${spacing.lg}px;
  margin-bottom: ${spacing.lg}px;
`;

export const ExposureGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: ${spacing.lg}px;
  margin-bottom: ${spacing.lg}px;
`;

export const ExposureSidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm}px;
`;

export const RiskCard = styled(Card)`
  padding: ${spacing.md}px;
`;

export const RiskLabel = styled.div`
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.bold};
  color: ${colors.error};
`;

export const RiskValue = styled.div`
  font-size: ${typography.sizes.xl}px;
  font-weight: ${typography.weights.bold};
  margin-top: ${spacing.sm}px;
`;

export const RiskNote = styled.div`
  color: ${colors.text.secondary};
  margin-top: ${spacing.sm}px;
  font-size: ${typography.sizes.sm}px;
`;

export const AllocationsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${spacing.md}px;
  border-bottom: 1px solid ${colors.outlineVariant};

  h3 {
    margin: 0;
    font-family: Manrope, sans-serif;
    font-weight: ${typography.weights.bold};
    font-size: ${typography.sizes.md}px;
    color: ${colors.text.primary};
  }
`;

export const TableWrap = styled.div`
  overflow-x: auto;
`;

export const FooterBar = styled.footer`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${spacing.md}px;
  background: ${colors.surfaceContainer};
  border-top: 1px solid ${colors.outlineVariant};
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.xs}px;
`;

export const FooterLinks = styled.div`
  display: flex;
  gap: ${spacing.md}px;

  a {
    color: ${colors.text.secondary};
    text-decoration: none;
  }
`;
