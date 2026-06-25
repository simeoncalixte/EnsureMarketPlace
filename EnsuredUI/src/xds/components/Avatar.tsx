import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, typography } from '../tokens'

export type XdsAvatarProps = {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_PX: Record<NonNullable<XdsAvatarProps['size']>, number> = {
  sm: 28,
  md: 40,
  lg: 64
}

// Six brand-ish hues sourced from the design palette; a deterministic hash of
// the name picks one so the same person always renders the same color.
const HUES: string[] = [
  colors.brand[500],
  colors.primary,
  colors.dataViz.purple,
  colors.dataViz.teal,
  colors.accent,
  colors.dataViz.orange
]

const hashName = (name: string): number => {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')

type CircleProps = {
  $size: number
  $background: string
  $color: string
}

const Circle = styled.span<CircleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: ${(p: CircleProps) => p.$size}px;
  height: ${(p: CircleProps) => p.$size}px;
  border-radius: ${radii.round}px;
  overflow: hidden;
  background: ${(p: CircleProps) => p.$background};
  color: ${(p: CircleProps) => p.$color};
  font-family: ${typography.fontFamily};
  font-weight: ${typography.weights.semibold};
  font-size: ${(p: CircleProps) => Math.round(p.$size * 0.4)}px;
  letter-spacing: 0.5px;
  user-select: none;
`

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

export const Avatar: React.FC<XdsAvatarProps> = ({ name, src, size = 'md' }) => {
  const [errored, setErrored] = useState(false)

  // Reset the error state when the source changes so a new src gets a chance.
  useEffect(() => {
    setErrored(false)
  }, [src])

  const px = SIZE_PX[size]
  const hue = HUES[hashName(name) % HUES.length]
  const showImage = Boolean(src) && !errored

  return (
    <Circle
      role="img"
      aria-label={name}
      $size={px}
      $background={showImage ? colors.surfaceContainerHigh : withAlpha(hue, 0.25)}
      $color={hue}
    >
      {showImage ? (
        <Img src={src as string} alt="" onError={() => setErrored(true)} />
      ) : (
        initialsOf(name)
      )}
    </Circle>
  )
}

export default Avatar
