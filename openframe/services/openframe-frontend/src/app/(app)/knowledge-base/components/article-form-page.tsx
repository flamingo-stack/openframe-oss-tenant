'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useEditArticleForm } from '../hooks/use-edit-article-form';
import { ArticleFormFields } from './article-form-fields';

interface ArticleFormPageProps {
  articleId: string | null;
  initialFolderId?: string | null;
}

export function ArticleFormPage({ articleId, initialFolderId }: ArticleFormPageProps) {
  const router = useRouter();
  const { form, isEditMode, isSubmitting, handleSave, managedFiles, onAddFiles, onRemoveFile } = useEditArticleForm({
    articleId,
    initialFolderId,
  });

  const backButton = useMemo(
    () =>
      isEditMode && articleId
        ? { label: 'Back to Article', onClick: () => router.push(`/knowledge-base/details/${articleId}`) }
        : { label: 'Back to Knowledge Base', onClick: () => router.push('/knowledge-base') },
    [router, isEditMode, articleId],
  );

  const actions = useMemo(
    () => [
      {
        label: 'Save as Draft',
        onClick: () => {},
        variant: 'card' as const,
      },
      {
        label: 'Save and Publish',
        onClick: handleSave,
        variant: 'primary' as const,
        disabled: isSubmitting,
        loading: isSubmitting,
      },
    ],
    [handleSave, isSubmitting],
  );

  return (
    <PageLayout
      title={isEditMode ? 'Edit Article' : 'New Article'}
      backButton={backButton}
      actions={actions}
      padding="none"
    >
      <ArticleFormFields form={form} managedFiles={managedFiles} onAddFiles={onAddFiles} onRemoveFile={onRemoveFile} />
    </PageLayout>
  );
}
