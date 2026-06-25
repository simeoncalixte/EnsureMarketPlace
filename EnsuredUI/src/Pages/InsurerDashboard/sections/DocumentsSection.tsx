import React, { useEffect, useState } from 'react';
import * as S from '../InsurerDashboard.styles';
import FilePreviewGallery, { PreviewFile } from '../../../xds/components/FilePreviewGallery';
import { loadSubmissionFiles } from '../../../api/pipeline';

type Props = {
  isActive: boolean;
  submissionId: number | null | undefined;
};

/**
 * Documents tab — the files attached to the source submission, each with an
 * inline preview (image/PDF/text natively; OCR-extracted text for everything
 * else). Backed by the schema's base `documents` component section, so every
 * generated schema exposes the submission's documents.
 */
export default function DocumentsSection({ isActive, submissionId }: Props) {
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (submissionId == null) {
      setFiles([]);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    loadSubmissionFiles(submissionId).then((result) => {
      if (cancelled) return;
      setFiles(result);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  return (
    <S.Section $active={isActive}>
      <S.SectionHeader>
        <S.SectionTitle>02b Documents</S.SectionTitle>
        <S.SectionRule />
      </S.SectionHeader>
      <FilePreviewGallery
        files={files}
        emptyMessage={
          submissionId == null
            ? 'This draft is not linked to a submission, so there are no ingested documents to show.'
            : loaded
              ? 'No files are attached to this submission.'
              : 'Loading documents…'
        }
      />
    </S.Section>
  );
}
