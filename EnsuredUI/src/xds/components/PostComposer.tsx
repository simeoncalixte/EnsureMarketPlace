import React, { useState } from 'react'
import styled from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing } from '../tokens'
import Textarea from './Textarea'
import Select from './Select'
import Button from './Button'

export type XdsPostComposerProps = {
  onSubmit: (content: string, visibility: 'public' | 'connections') => void | Promise<void>
  busy?: boolean
  placeholder?: string
}

const Surface = styled.div`
  background: ${colors.surfaceRaised};
  padding: ${spacing.lg}px;
  border-radius: ${radii.lg}px;
  border: 1px solid ${withAlpha(colors.white, 0.05)};
  display: flex;
  flex-direction: column;
  gap: ${spacing.md}px;
`

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${spacing.md}px;
`

const VisibilityWrap = styled.div`
  min-width: 180px;
`

export const PostComposer: React.FC<XdsPostComposerProps> = ({
  onSubmit,
  busy = false,
  placeholder = 'Share an update with your network…'
}) => {
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'connections'>('public')

  const trimmed = content.trim()
  const disabled = busy || trimmed.length === 0

  const handleSubmit = async () => {
    if (disabled) return
    await onSubmit(trimmed, visibility)
    setContent('')
  }

  return (
    <Surface>
      <Textarea
        value={content}
        placeholder={placeholder}
        disabled={busy}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
          setContent(event.target.value)
        }
        rows={3}
      />
      <Controls>
        <VisibilityWrap>
          <Select
            aria-label="Post visibility"
            value={visibility}
            disabled={busy}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              setVisibility(event.target.value as 'public' | 'connections')
            }
          >
            <option value="public">Public</option>
            <option value="connections">Connections only</option>
          </Select>
        </VisibilityWrap>
        <Button variant="primary" disabled={disabled} onClick={handleSubmit}>
          Post
        </Button>
      </Controls>
    </Surface>
  )
}

export default PostComposer
