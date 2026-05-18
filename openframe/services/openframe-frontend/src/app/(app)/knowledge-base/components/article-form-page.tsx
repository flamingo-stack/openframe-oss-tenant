'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import { notFound } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { useEditArticleForm } from '../hooks/use-edit-article-form';
import type { KnowledgeBaseItemNode } from '../hooks/use-knowledge-base-item';
import { useKnowledgeBaseItem } from '../hooks/use-knowledge-base-item';
import { useKnowledgeBaseTags } from '../hooks/use-knowledge-base-tags';
import { ArticleFormFields } from './article-form-fields';

interface ArticleFormPageProps {
  articleId: string | null;
  initialFolderId?: string | null;
}

interface FormShellProps {
  articleId: string | null;
  initialFolderId?: string | null;
  initialArticle: KnowledgeBaseItemNode | null;
}

function FormShell({ articleId, initialFolderId, initialArticle }: FormShellProps) {
  const availableTags = useKnowledgeBaseTags(initialFolderId ?? null);

  const { form, isEditMode, isSubmitting, handleSave, tempAttachments } = useEditArticleForm({
    articleId,
    initialFolderId,
    initialArticle,
  });

  const backToArticle = useSafeBack(`/knowledge-base/details/${articleId ?? ''}`);
  const backToKb = useSafeBack('/knowledge-base');
  const backButton = useMemo(
    () => (isEditMode && articleId ? { label: 'Back', onClick: backToArticle } : { label: 'Back', onClick: backToKb }),
    [isEditMode, articleId, backToArticle, backToKb],
  );

  const isPublished = initialArticle?.status === 'PUBLISHED';

  const actions = useMemo(
    () => [
      ...(isPublished
        ? []
        : [
            {
              label: 'Save as Draft',
              onClick: () => handleSave('DRAFT', { availableTags }),
              variant: 'outline' as const,
              disabled: isSubmitting,
            },
          ]),
      {
        label: 'Save and Publish',
        onClick: () => handleSave('PUBLISHED', { availableTags }),
        variant: 'accent' as const,
        disabled: isSubmitting,
      },
    ],
    [handleSave, isSubmitting, availableTags, isPublished],
  );

  return (
    <PageLayout
      title={isEditMode ? 'Edit Article' : 'New Article'}
      backButton={backButton}
      actions={actions}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <ArticleFormFields form={form} availableTags={availableTags} tempAttachments={tempAttachments} />
    </PageLayout>
  );
}

function EditFormBody({ articleId, initialFolderId }: { articleId: string; initialFolderId?: string | null }) {
  const initialArticle = useKnowledgeBaseItem(articleId);
  if (!initialArticle || initialArticle.type !== 'ARTICLE') {
    notFound();
  }
  return <FormShell articleId={articleId} initialFolderId={initialFolderId} initialArticle={initialArticle} />;
}

function ArticleFormFallback({ isEditMode }: { isEditMode: boolean }) {
  const handleBack = useSafeBack('/knowledge-base');
  return (
    <PageLayout
      title={isEditMode ? 'Edit Article' : 'New Article'}
      backButton={{ label: 'Back', onClick: handleBack }}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-system-lf)]">
        <div className="h-12 w-full rounded bg-ods-card animate-pulse" />
        <div className="h-12 w-full rounded bg-ods-card animate-pulse" />
      </div>
      <div className="h-12 w-full rounded bg-ods-card animate-pulse" />
      <div className="h-64 w-full rounded bg-ods-card animate-pulse" />
    </PageLayout>
  );
}

export function ArticleFormPage({ articleId, initialFolderId }: ArticleFormPageProps) {
  const isEditMode = articleId !== null;
  return (
    <Suspense fallback={<ArticleFormFallback isEditMode={isEditMode} />}>
      {articleId ? (
        <EditFormBody articleId={articleId} initialFolderId={initialFolderId} />
      ) : (
        <FormShell articleId={null} initialFolderId={initialFolderId} initialArticle={null} />
      )}
    </Suspense>
  );
}
