import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useMarketplaceHomepageRequestProgress } from '../api/requestProgress';
import { colors, withAlpha } from '../xds/colors';

const enter = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;
const orbit = keyframes`to { transform: rotate(360deg); }`;

const Panel = styled.aside`
  position: absolute;
  left: 20px;
  top: calc(min(100dvh, 640px) - 150px);
  z-index: 24;
  width: min(300px, calc(100vw - 40px));
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  border: 1px solid ${withAlpha(colors.primarySoft, .18)};
  border-radius: 10px;
  background: ${withAlpha(colors.surfaceDeep, .92)};
  box-shadow: 0 12px 32px ${withAlpha(colors.black, .22)};
  backdrop-filter: blur(10px);
  animation: ${enter} 180ms ease-out;

  @media (max-height: 520px) {
    top: auto;
    bottom: 16px;
  }

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const MiniOrbit = styled.div`
  position: relative;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
`;

const MiniCore = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid ${withAlpha(colors.accent, .45)};
  background: ${withAlpha(colors.accent, .12)};
  box-shadow: 0 0 10px ${withAlpha(colors.accent, .24)};
`;

const MiniRing = styled.span<{ $size: number; $error: boolean; $duration: number }>`
  position: absolute;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  border: 1px solid ${({ $error }) => $error ? withAlpha(colors.error, .5) : withAlpha(colors.primarySoft, .28)};
  animation: ${orbit} ${({ $duration }) => $duration}s linear infinite;
  animation-play-state: ${({ $error }) => $error ? 'paused' : 'running'};

  &::after {
    content: '';
    position: absolute;
    top: -3px;
    left: calc(50% - 3px);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $error }) => $error ? colors.error : colors.primary};
    box-shadow: 0 0 8px ${({ $error }) => $error ? colors.error : colors.primary};
  }

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const Copy = styled.div`
  min-width: 0;
`;

const Heading = styled.div`
  margin-bottom: 5px;
  color: ${colors.onSurfaceVariant};
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .11em;
  text-transform: uppercase;
`;

const Item = styled.div<{ $error: boolean }>`
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  min-height: 18px;
  color: ${({ $error }) => $error ? colors.errorSoft : colors.onSurfaceMuted};
  font-size: 10px;
`;

const Mark = styled.span<{ $error: boolean }>`
  color: ${({ $error }) => $error ? colors.error : colors.primarySoft};
  text-align: center;
`;

/** Non-blocking status for secondary homepage data that continues after layout resolution. */
export default function BackgroundRequestProgress() {
  const requests = useMarketplaceHomepageRequestProgress();
  const remaining = requests.filter(
    (request) => request.id !== 'dashboard' && (request.status === 'pending' || request.status === 'error'),
  );
  if (remaining.length === 0) return null;

  return (
    <Panel aria-live="polite" aria-label="Background homepage loading status">
      <MiniOrbit aria-hidden="true">
        {remaining.map((request, index) => (
          <MiniRing
            key={request.id}
            $size={28 + (remaining.length > 1 ? index * (18 / (remaining.length - 1)) : 9)}
            $error={request.status === 'error'}
            $duration={2.2 + index * .55}
          />
        ))}
        <MiniCore />
      </MiniOrbit>
      <Copy>
        <Heading>Finishing your workspace</Heading>
        {remaining.map((request) => (
          <Item key={request.id} $error={request.status === 'error'}>
            <Mark $error={request.status === 'error'}>{request.status === 'error' ? '!' : '·'}</Mark>
            <span>{request.status === 'error' ? request.errorLabel : request.label}</span>
          </Item>
        ))}
      </Copy>
    </Panel>
  );
}
