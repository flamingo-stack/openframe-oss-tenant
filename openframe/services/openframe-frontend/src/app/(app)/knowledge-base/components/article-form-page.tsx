'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import { notFound, useRouter } from 'next/navigation';
import { Suspense, useMemo } from 'react';
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
  const router = useRouter();
  const availableTags = useKnowledgeBaseTags(initialFolderId ?? null);

  const { form, isEditMode, isSubmitting, handleSave } = useEditArticleForm({
    articleId,
    initialFolderId,
    initialArticle,
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
        onClick: () => handleSave('DRAFT', { availableTags }),
        variant: 'outline' as const,
        disabled: isSubmitting,
        loading: isSubmitting,
      },
      {
        label: 'Save and Publish',
        onClick: () => handleSave('PUBLISHED', { availableTags }),
        variant: 'accent' as const,
        disabled: isSubmitting,
        loading: isSubmitting,
      },
    ],
    [handleSave, isSubmitting, availableTags],
  );

  return (
    <PageLayout
      title={isEditMode ? 'Edit Article' : 'New Article'}
      backButton={backButton}
      actions={actions}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <ArticleFormFields form={form} availableTags={availableTags} />
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
  const router = useRouter();
  return (
    <PageLayout
      title={isEditMode ? 'Edit Article' : 'New Article'}
      backButton={{ label: 'Back to Knowledge Base', onClick: () => router.push('/knowledge-base') }}
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
