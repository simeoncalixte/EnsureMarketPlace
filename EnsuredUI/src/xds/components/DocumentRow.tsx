import React from 'react'
import styled from 'styled-components'
import ValidationMessage from './ValidationMessage'
import { colors, withAlpha } from '../colors'

const RowWrapper = styled.div<{ $hasError?: boolean }>`
  background: ${withAlpha(colors.surfaceDeep, 0.4)};
  border: 1px solid ${(p) => (p.$hasError ? withAlpha(colors.dangerBright, 0.65) : withAlpha(colors.white, 0.05))};
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${withAlpha(colors.primary, 0.3)};
  }
`

const RowBody = styled.div`
  flex: 1;
`

const RowTitle = styled.div`
  font-weight: 700;
  font-size: 14px;
  color: ${colors.onSurfaceStrong};
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const RowDesc = styled.div`
  font-size: 12px;
  color: ${colors.outline};
`

const RowRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`

const StatusBadge = styled.span<{ $variant?: 'verified' | 'uploaded' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: ${(p) => {
    if (p.$variant === 'verified' || p.$variant === 'uploaded') return withAlpha(colors.dataViz.emerald, 0.12)
    return withAlpha(colors.primary, 0.12)
  }};
  color: ${(p) => {
    if (p.$variant === 'verified' || p.$variant === 'uploaded') return colors.dataViz.emerald
    return colors.primary
  }};
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 4px;
`

const OptionalTag = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${colors.outline};
  letter-spacing: 0.04em;
`

const FileTag = styled.span`
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.outline};
`

const UploadBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${withAlpha(colors.primary, 0.1)};
  color: ${colors.primary};
  border: 1px solid ${withAlpha(colors.primary, 0.2)};
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${colors.primary};
    color: ${colors.white};
  }
`

const HiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const UploadLabel = styled.label`
  display: inline-flex;
`

const ViewBtn = styled.button`
  background: none;
  border: 0;
  color: ${colors.outline};
  cursor: pointer;
  padding: 4px;
`

export type DocumentRowProps = {
  title: string
  description: string
  docStatus?: 'required' | 'optional' | 'verified'
  uploaded: boolean
  uploadedFilename?: string
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onView?: () => void
  ariaLabel?: string
  error?: string
}

export const DocumentRow: React.FC<DocumentRowProps> = ({
  title,
  description,
  docStatus = 'required',
  uploaded,
  uploadedFilename,
  onUpload,
  onView,
  ariaLabel,
  error,
}) => {
  const isVerified = docStatus === 'verified'
  const isOptional = docStatus === 'optional'

  return (
    <RowWrapper $hasError={!!error}>
      <RowBody>
        <RowTitle>
          {title}
          {isVerified && <StatusBadge $variant="verified">✓ Verified</StatusBadge>}
          {uploaded && !isVerified && <StatusBadge $variant="uploaded">✓ Uploaded</StatusBadge>}
        </RowTitle>
        <RowDesc>{description}</RowDesc>
        {error && <ValidationMessage>{error}</ValidationMessage>}
      </RowBody>
      <RowRight>
        {isVerified ? (
          <>
            <FileTag>{uploadedFilename}</FileTag>
            <ViewBtn onClick={onView} title="View document" type="button">
              👁
            </ViewBtn>
          </>
        ) : isOptional ? (
          <>
            <OptionalTag>Optional</OptionalTag>
            <UploadLabel>
              <HiddenFileInput
                aria-label={ariaLabel || `Upload ${title}`}
                type="file"
                onChange={onUpload}
              />
              <UploadBtn as="span">↑ Upload</UploadBtn>
            </UploadLabel>
            {uploadedFilename && <FileTag>{uploadedFilename}</FileTag>}
          </>
        ) : (
          <>
            <UploadLabel>
              <HiddenFileInput
                aria-label={ariaLabel || `Upload ${title}`}
                type="file"
                onChange={onUpload}
              />
              <UploadBtn as="span">↑ Upload</UploadBtn>
            </UploadLabel>
            {uploadedFilename && <FileTag>{uploadedFilename}</FileTag>}
          </>
        )}
      </RowRight>
    </RowWrapper>
  )
}

export default DocumentRow
