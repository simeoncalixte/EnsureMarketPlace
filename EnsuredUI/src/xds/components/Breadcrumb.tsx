import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { spacing } from '../tokens'

export type BreadcrumbItem = {
  label: string
  href?: string
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
}

export type BreadcrumbProps = {
  label?: string
  items: BreadcrumbItem[]
}

export type XdsBreadcrumbProps = BreadcrumbProps

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.lg}px;
`

const FieldLabel = styled.label`
  font-size: 10px;
  font-family: ui-monospace, Menlo, monospace;
  text-transform: uppercase;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 8px;
`

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
`

const CurrentItem = styled.span`
  color: ${colors.text.primary};
`

const LinkItem = styled.a`
  color: var(--text-secondary);
  text-decoration: none;
  cursor: pointer;
`

const Separator = styled.span`
  color: var(--text-secondary);
  font-size: 14px;
`

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ label = 'Breadcrumbs', items }) => {
  return (
    <Container>
      <div>
        <FieldLabel>{label}</FieldLabel>
        <Nav aria-label="breadcrumb">
          {items.map((it, idx) => {
            const isLast = idx === items.length - 1
            return (
              <React.Fragment key={idx}>
                {isLast ? (
                  <CurrentItem aria-current="page">{it.label}</CurrentItem>
                ) : (
                  <LinkItem href={it.href ?? '#'} onClick={it.onClick}>
                    {it.label}
                  </LinkItem>
                )}
                {!isLast && <Separator aria-hidden>›</Separator>}
              </React.Fragment>
            )
          })}
        </Nav>
      </div>
    </Container>
  )
}

export default Breadcrumb
