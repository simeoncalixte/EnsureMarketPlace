import React, { useState } from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { spacing, radii, typography } from '../tokens'

const Surface = styled.div<{ $hover: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${spacing.sm}px;
  padding: ${spacing.xl}px ${spacing.lg}px;
  border: 2px dashed
    ${({ $hover }) => ($hover ? colors.primary : colors.outlineVariant)};
  border-radius: ${radii.lg}px;
  background: ${({ $hover }) =>
    $hover ? colors.surfaceContainerHigh : colors.surfaceContainerLow};
  text-align: center;
  transition: border-color 120ms ease, background 120ms ease;
  font-family: ${typography.fontFamily};
`

const Icon = styled.span`
  font-size: 40px;
  color: ${colors.primary};
  line-height: 1;
`

const Title = styled.div`
  font-size: ${typography.sizes.md}px;
  font-weight: ${typography.weights.semibold};
  color: ${colors.text.primary};
`

const Helper = styled.div`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.secondary};
`

const Filename = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xs}px;
  margin-top: ${spacing.xs}px;
  font-size: ${typography.sizes.sm}px;
  font-weight: ${typography.weights.medium};
  color: ${colors.text.accent};
`

const HiddenInput = styled.input`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
`

export type FileDropzoneProps = {
  title: string
  helperText?: string
  accept?: string
  onFile?: (file: File) => void
  uploadedFilename?: string
  id?: string
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  title,
  helperText,
  accept,
  onFile,
  uploadedFilename,
  id
}) => {
  const [hover, setHover] = useState(false)

  const handleFiles = (files: FileList | null) => {
    const file = files && files.item(0)
    if (file && onFile) {
      onFile(file)
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setHover(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setHover(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setHover(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <Surface
      $hover={hover}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Icon className="material-symbols-outlined" aria-hidden="true">
        upload_file
      </Icon>
      <Title>{title}</Title>
      {helperText ? <Helper>{helperText}</Helper> : null}
      {uploadedFilename ? (
        <Filename>
          <span className="material-symbols-outlined" aria-hidden="true">
            description
          </span>
          {uploadedFilename}
        </Filename>
      ) : null}
      <HiddenInput
        id={id}
        type="file"
        accept={accept}
        aria-label={title}
        onChange={handleChange}
      />
    </Surface>
  )
}

export default FileDropzone
