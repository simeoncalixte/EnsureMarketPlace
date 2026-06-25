import React, { useState } from 'react'
import styled from 'styled-components'
import { spacing } from '../tokens'
import Button from './Button'

export type XdsConnectionButtonProps = {
  status: 'none' | 'pending_outgoing' | 'pending_incoming' | 'connected' | 'blocked' | 'self'
  onConnect?: () => void
  onAccept?: () => void
  onDecline?: () => void
  onRemove?: () => void
  busy?: boolean
}

const Pair = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.sm}px;
`

export const ConnectionButton: React.FC<XdsConnectionButtonProps> = ({
  status,
  onConnect,
  onAccept,
  onDecline,
  onRemove,
  busy = false
}) => {
  const [hovered, setHovered] = useState(false)

  switch (status) {
    case 'none':
      return (
        <Button variant="primary" disabled={busy} onClick={onConnect}>
          Connect
        </Button>
      )

    case 'pending_outgoing':
      return (
        <Button variant="secondary" disabled>
          Pending
        </Button>
      )

    case 'pending_incoming':
      return (
        <Pair>
          <Button variant="primary" disabled={busy} onClick={onAccept}>
            Accept
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onDecline}>
            Decline
          </Button>
        </Pair>
      )

    case 'connected':
      return (
        <Button
          variant="secondary"
          tone={hovered ? 'danger' : 'default'}
          disabled={busy}
          onClick={onRemove}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {hovered ? 'Remove' : 'Connected ✓'}
        </Button>
      )

    case 'blocked':
      return (
        <Button variant="secondary" disabled>
          Blocked
        </Button>
      )

    case 'self':
    default:
      return null
  }
}

export default ConnectionButton
