import React, { useState } from 'react'
import styled from 'styled-components'
import { colors, withAlpha } from '../colors'

/**
 * FilePreviewGallery — a grid of submission-file cards, each with an inline
 * preview. Every file type gets a preview:
 *   - images render directly
 *   - PDFs embed in a frame
 *   - text-ish files show their (extracted) text
 *   - anything else falls back to the OCR-extracted text preview when present,
 *     or a clear "no inline preview" placeholder with an open/download link.
 *
 * Pure: data in via props, no fetching.
 */

export type PreviewFile = {
  id: number | string
  fileName: string
  /** Browser MIME type (drives which preview renders). */
  mimeType?: string | null
  fileSize?: number | null
  /** URL serving the raw file inline; absent files show text/placeholder only. */
  contentUrl?: string | null
  /** Extracted text (e.g. from OCR) — the universal fallback preview. */
  textPreview?: string | null
}

type FilePreviewGalleryProps = {
  files: PreviewFile[]
  emptyMessage?: string
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
`

const CardWrap = styled.div`
  background: ${withAlpha(colors.surfaceDeep, 0.4)};
  border: 1px solid ${withAlpha(colors.white, 0.05)};
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${withAlpha(colors.primary, 0.3)};
  }
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid ${withAlpha(colors.white, 0.05)};
`

const FileName = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${colors.onSurfaceStrong};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const FileMeta = styled.div`
  font-size: 10px;
  color: ${colors.outline};
  flex-shrink: 0;
`

const PreviewArea = styled.div`
  min-height: 120px;
  max-height: 220px;
  overflow: hidden;
  background: ${withAlpha(colors.surfaceDeep, 0.6)};
  display: flex;
  align-items: stretch;
  justify-content: center;
`

const PreviewImage = styled.img`
  width: 100%;
  object-fit: contain;
  max-height: 220px;
`

const PreviewFrame = styled.iframe`
  width: 100%;
  height: 220px;
  border: 0;
  background: ${colors.white};
`

const PreviewText = styled.pre`
  margin: 0;
  padding: 12px 14px;
  width: 100%;
  font-size: 10px;
  line-height: 1.5;
  color: ${colors.outline};
  white-space: pre-wrap;
  word-break: break-word;
  overflow: hidden;
`

const Placeholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 20px;
  font-size: 11px;
  color: ${colors.outline};
`

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 14px;
`

const KindBadge = styled.span`
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${colors.primary};
  background: ${withAlpha(colors.primary, 0.12)};
  border-radius: 999px;
  padding: 2px 8px;
`

const OpenLink = styled.a`
  font-size: 11px;
  font-weight: 700;
  color: ${colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const ToggleButton = styled.button`
  font-size: 10px;
  font-weight: 700;
  color: ${colors.outline};
  background: transparent;
  border: 1px solid ${withAlpha(colors.white, 0.12)};
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;

  &:hover {
    color: ${colors.onSurfaceStrong};
    border-color: ${withAlpha(colors.primary, 0.4)};
  }
`

const Empty = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 12px;
  color: ${colors.outline};
  border: 1px dashed ${withAlpha(colors.white, 0.1)};
  border-radius: 12px;
`

type PreviewKind = 'image' | 'pdf' | 'text' | 'extracted-text' | 'none'

function previewKindFor(file: PreviewFile): PreviewKind {
  const mime = (file.mimeType ?? '').toLowerCase()
  if (file.contentUrl && mime.startsWith('image/')) return 'image'
  if (file.contentUrl && mime.includes('pdf')) return 'pdf'
  if (mime.startsWith('text/') && (file.textPreview || file.contentUrl)) return 'text'
  if (file.textPreview) return 'extracted-text'
  return 'none'
}

function kindLabel(kind: PreviewKind, mime: string | null | undefined): string {
  if (kind === 'image') return 'Image'
  if (kind === 'pdf') return 'PDF'
  if (kind === 'text') return 'Text'
  if (kind === 'extracted-text') return 'Extracted Text'
  return (mime ?? 'file').split('/').pop()?.split('.').pop()?.toUpperCase().slice(0, 12) || 'File'
}

function formatSize(bytes: number | null | undefined): string | null {
  if (bytes == null || !Number.isFinite(bytes)) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FilePreviewCard({ file }: { file: PreviewFile }) {
  const [previewVisible, setPreviewVisible] = useState(true)
  const kind = previewKindFor(file)
  const size = formatSize(file.fileSize)

  return (
    <CardWrap data-testid={`file-card-${file.id}`}>
      <CardHeader>
        <FileName title={file.fileName}>{file.fileName}</FileName>
        {size ? <FileMeta>{size}</FileMeta> : null}
      </CardHeader>
      {previewVisible ? (
        <PreviewArea>
          {kind === 'image' ? (
            <PreviewImage src={file.contentUrl ?? undefined} alt={`Preview of ${file.fileName}`} />
          ) : kind === 'pdf' ? (
            <PreviewFrame src={file.contentUrl ?? undefined} title={`Preview of ${file.fileName}`} />
          ) : kind === 'text' && file.textPreview ? (
            <PreviewText>{file.textPreview}</PreviewText>
          ) : kind === 'text' ? (
            <PreviewFrame src={file.contentUrl ?? undefined} title={`Preview of ${file.fileName}`} />
          ) : kind === 'extracted-text' ? (
            <PreviewText>{file.textPreview}</PreviewText>
          ) : (
            <Placeholder>
              <span>No inline preview for this format.</span>
              {file.contentUrl ? <span>Use “Open file” to download or view it.</span> : null}
            </Placeholder>
          )}
        </PreviewArea>
      ) : null}
      <CardFooter>
        <KindBadge>{kindLabel(kind, file.mimeType)}</KindBadge>
        <span>
          <ToggleButton type="button" onClick={() => setPreviewVisible((v) => !v)} aria-label={`Toggle preview of ${file.fileName}`}>
            {previewVisible ? 'Hide preview' : 'Show preview'}
          </ToggleButton>{' '}
          {file.contentUrl ? (
            <OpenLink href={file.contentUrl} target="_blank" rel="noreferrer">
              Open file
            </OpenLink>
          ) : null}
        </span>
      </CardFooter>
    </CardWrap>
  )
}

export default function FilePreviewGallery({ files, emptyMessage }: FilePreviewGalleryProps) {
  if (files.length === 0) {
    return <Empty>{emptyMessage ?? 'No files are attached to this submission.'}</Empty>
  }
  return (
    <Grid>
      {files.map((file) => (
        <FilePreviewCard key={file.id} file={file} />
      ))}
    </Grid>
  )
}
