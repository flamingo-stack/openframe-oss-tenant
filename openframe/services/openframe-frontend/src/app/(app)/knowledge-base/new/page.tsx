'use client';

import { notFound, useSearchParams } from 'next/navigation';
import { featureFlags } from '@/lib/feature-flags';
import { ArticleFormPage } from '../components/article-form-page';

export default function NewArticlePageWrapper() {
  const searchParams = useSearchParams();

  if (!featureFlags.knowledgeBase.enabled()) {
    notFound();
  }

  const folderId = searchParams.get('folderId');
  return <ArticleFormPage articleId={null} initialFolderId={folderId} />;
}

export const dynamic = 'force-dynamic';
