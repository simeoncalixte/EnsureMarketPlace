import React from 'react'
import styled from 'styled-components'
import { spacing, radii } from '../tokens'
import { colors } from '../colors'

const HeaderWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm + spacing.xs}px;
  margin-bottom: ${spacing.md + spacing.xs}px;
`

const IconBox = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${radii.md}px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`

const HeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs}px;
`

const HeaderTitle = styled.h3`
  margin: 0;
  font-family: Manrope, sans-serif;
  font-weight: 800;
  font-size: 16px;
  color: ${colors.onSurfaceStrong};
`

const HeaderSubtitle = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${colors.outline};
`

const HeaderAction = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
`

export type SectionHeaderProps = {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  /** Optional right-aligned slot for an action (e.g. a button or link). */
  action?: React.ReactNode
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, subtitle, action }) => {
  return (
    <HeaderWrapper>
      {icon && <IconBox>{icon}</IconBox>}
      <HeaderContent>
        <HeaderTitle>{title}</HeaderTitle>
        {subtitle && <HeaderSubtitle>{subtitle}</HeaderSubtitle>}
      </HeaderContent>
      {action && <HeaderAction>{action}</HeaderAction>}
    </HeaderWrapper>
  )
}

export default SectionHeader
