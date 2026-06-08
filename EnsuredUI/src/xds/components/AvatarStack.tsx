import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { radii, typography } from '../tokens'

export type AvatarStackItem = {
  src?: string
  initials?: string
  gradient?: string
}

export type AvatarStackProps = {
  avatars: AvatarStackItem[]
  max?: number
  size?: number
}

const DEFAULT_GRADIENT = `linear-gradient(135deg, ${colors.brand[400]}, ${colors.brand[600]})`

const Stack = styled.div`
  display: inline-flex;
  flex-direction: row;
  align-items: center;
`

const AvatarBase = styled.div<{ $size: number; $overlap: number }>`
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  border-radius: ${radii.round}px;
  box-sizing: border-box;
  border: 2px solid ${colors.surface};
  overflow: hidden;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: ${typography.fontFamily};
  font-weight: ${typography.weights.semibold};
  color: ${colors.neutral[0]};
  line-height: 1;

  &:not(:first-child) {
    margin-left: -${(p) => p.$overlap}px;
  }
`

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

const GradientAvatar = styled(AvatarBase)<{ $gradient: string; $fontSize: number }>`
  background: ${(p) => p.$gradient};
  font-size: ${(p) => p.$fontSize}px;
`

const OverflowChip = styled(AvatarBase)<{ $fontSize: number }>`
  background: ${colors.neutral[700]};
  font-size: ${(p) => p.$fontSize}px;
`

export const AvatarStack: React.FC<AvatarStackProps> = ({ avatars, max, size = 32 }) => {
  const overlap = Math.round(size * 0.3)
  const fontSize = Math.max(10, Math.round(size * 0.4))

  const effectiveMax = typeof max === 'number' && max > 0 ? max : avatars.length
  const visible = avatars.slice(0, effectiveMax)
  const overflowCount = avatars.length - visible.length

  return (
    <Stack role="group" aria-label="Avatar stack">
      {visible.map((avatar, index) => {
        const initials = avatar.initials ?? ''
        if (avatar.src) {
          return (
            <AvatarBase key={index} $size={size} $overlap={overlap}>
              <AvatarImg src={avatar.src} alt={initials || 'Avatar'} />
            </AvatarBase>
          )
        }
        return (
          <GradientAvatar
            key={index}
            $size={size}
            $overlap={overlap}
            $gradient={avatar.gradient ?? DEFAULT_GRADIENT}
            $fontSize={fontSize}
          >
            {initials}
          </GradientAvatar>
        )
      })}
      {overflowCount > 0 && (
        <OverflowChip
          $size={size}
          $overlap={overlap}
          $fontSize={fontSize}
          aria-label={`${overflowCount} more`}
        >
          {`+${overflowCount}`}
        </OverflowChip>
      )}
    </Stack>
  )
}

export default AvatarStack
