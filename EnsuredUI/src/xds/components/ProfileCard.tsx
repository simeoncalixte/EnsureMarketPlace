import React from 'react'
import styled, { css } from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing, typography } from '../tokens'
import Avatar from './Avatar'
import Badge from './Badge'

export type XdsProfileCardProps = {
  name: string
  headline?: string | null
  organizationName?: string | null
  role?: string | null
  avatarUrl?: string | null
  connectionCount?: number | null
  onClick?: () => void
  action?: React.ReactNode
}

type SurfaceProps = { $clickable: boolean }

// Card-like surface mirroring Card.tsx's default visuals, with an
// interactive hover elevation when an onClick is provided.
const Surface = styled.div<SurfaceProps>`
  background: ${colors.surfaceRaised};
  padding: ${spacing.lg}px;
  border-radius: ${radii.lg}px;
  border: 1px solid ${withAlpha(colors.white, 0.05)};
  display: flex;
  align-items: flex-start;
  gap: ${spacing.md}px;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;

  ${(p: SurfaceProps) =>
    p.$clickable &&
    css`
      cursor: pointer;
      outline: none;

      &:hover {
        border-color: ${colors.primary};
        background: ${colors.surfaceElevated};
        box-shadow: 0 6px 18px ${withAlpha(colors.black, 0.35)};
      }

      &:focus-visible {
        border-color: ${colors.primary};
        box-shadow: 0 0 0 2px ${withAlpha(colors.primary, 0.4)};
      }
    `}
`

const Body = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs}px;
`

const Name = styled.div`
  color: ${colors.text.primary};
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.md}px;
  font-weight: ${typography.weights.bold};
`

const Headline = styled.div`
  color: ${colors.text.secondary};
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.sm}px;
`

const OrgRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  flex-wrap: wrap;
`

const OrgName = styled.span`
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.sm}px;
  font-weight: ${typography.weights.medium};
`

const Connections = styled.div`
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
`

const ActionSlot = styled.div`
  flex: 0 0 auto;
  align-self: flex-start;
`

export const ProfileCard: React.FC<XdsProfileCardProps> = ({
  name,
  headline,
  organizationName,
  role,
  avatarUrl,
  connectionCount,
  onClick,
  action
}) => {
  const clickable = Boolean(onClick)

  const handleKeyDown = clickable
    ? (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }
    : undefined

  const interactiveProps = clickable
    ? { role: 'button' as const, tabIndex: 0, onClick, onKeyDown: handleKeyDown }
    : {}

  return (
    <Surface $clickable={clickable} {...interactiveProps}>
      <Avatar name={name} src={avatarUrl} size="lg" />
      <Body>
        <Name>{name}</Name>
        {headline ? <Headline>{headline}</Headline> : null}
        {organizationName || role ? (
          <OrgRow>
            {organizationName ? <OrgName>{organizationName}</OrgName> : null}
            {role ? <Badge variant="primary">{role}</Badge> : null}
          </OrgRow>
        ) : null}
        {connectionCount != null ? (
          <Connections>{connectionCount} connections</Connections>
        ) : null}
      </Body>
      {action ? (
        <ActionSlot
          onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}
        >
          {action}
        </ActionSlot>
      ) : null}
    </Surface>
  )
}

export default ProfileCard
