import React from 'react'
import styled from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing, typography } from '../tokens'
import Card from './Card'
import Badge from './Badge'
import Button from './Button'

export type XdsIntegrationCardProps = {
  provider: 'whatsapp' | 'telegram'
  verified: boolean
  simulated?: boolean
  verificationCode?: string | null
  displayName?: string | null
  onConnect?: () => void
  onDisconnect?: () => void
  busy?: boolean
  connectFields?: React.ReactNode
}

const providerMeta: Record<
  'whatsapp' | 'telegram',
  { label: string; mark: string; color: string }
> = {
  whatsapp: { label: 'WhatsApp', mark: 'WA', color: colors.dataViz.green },
  telegram: { label: 'Telegram', mark: 'TG', color: colors.dataViz.blueSky }
}

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  flex-wrap: wrap;
`

const Glyph = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${radii.round}px;
  background: ${({ $color }: { $color: string }) => withAlpha($color, 0.16)};
  border: 1px solid ${({ $color }: { $color: string }) => withAlpha($color, 0.4)};
  color: ${({ $color }: { $color: string }) => $color};
  font-size: ${typography.sizes.sm}px;
  font-weight: ${typography.weights.bold};
  font-family: ${typography.fontFamily};
  flex: 0 0 auto;
`

const ProviderName = styled.span`
  font-size: ${typography.sizes.md}px;
  font-weight: ${typography.weights.semibold};
  color: ${colors.onSurface};
  font-family: ${typography.fontFamily};
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.md}px;
  margin-top: ${spacing.md}px;
  font-family: ${typography.fontFamily};
`

const DisplayName = styled.span`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.onSurfaceVariant};
`

const CodeBox = styled.code`
  display: block;
  padding: ${spacing.sm}px ${spacing.md}px;
  border-radius: ${radii.md}px;
  background: ${colors.surfaceContainerHigh};
  border: 1px solid ${colors.outlineVariant};
  color: ${colors.onSurface};
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: ${typography.sizes.md}px;
  letter-spacing: 2px;
`

const HelperText = styled.p`
  margin: ${spacing.xs}px 0 0;
  font-size: ${typography.sizes.xs}px;
  color: ${colors.onSurfaceVariant};
`

const Actions = styled.div`
  display: flex;
  gap: ${spacing.sm}px;
`

export const IntegrationCard: React.FC<XdsIntegrationCardProps> = ({
  provider,
  verified,
  simulated = false,
  verificationCode,
  displayName,
  onConnect,
  onDisconnect,
  busy = false,
  connectFields
}) => {
  const meta = providerMeta[provider]
  const pendingCode = Boolean(verificationCode)

  return (
    <Card>
      <Header>
        <Glyph $color={meta.color} aria-hidden="true">
          {meta.mark}
        </Glyph>
        <ProviderName>{meta.label}</ProviderName>
        {verified ? (
          <Badge variant="success">Connected</Badge>
        ) : pendingCode ? (
          <Badge variant="warning">Awaiting verification</Badge>
        ) : (
          <Badge variant="neutral">Not connected</Badge>
        )}
        {simulated ? <Badge variant="neutral">Simulated</Badge> : null}
      </Header>
      <Body>
        {verified && displayName ? <DisplayName>{displayName}</DisplayName> : null}
        {pendingCode ? (
          <div>
            <CodeBox>{verificationCode}</CodeBox>
            <HelperText>Send this code to the bot/number to finish connecting.</HelperText>
          </div>
        ) : null}
        {connectFields}
        <Actions>
          {!verified && !pendingCode ? (
            <Button type="button" onClick={onConnect} disabled={busy}>
              Connect
            </Button>
          ) : (
            <Button type="button" variant="outline" tone="danger" onClick={onDisconnect} disabled={busy}>
              Disconnect
            </Button>
          )}
        </Actions>
      </Body>
    </Card>
  )
}

export default IntegrationCard
