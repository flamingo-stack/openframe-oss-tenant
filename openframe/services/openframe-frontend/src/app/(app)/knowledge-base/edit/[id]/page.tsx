'use client';

import { notFound, useParams } from 'next/navigation';
import { featureFlags } from '@/lib/feature-flags';
import { ArticleFormPage } from '../../components/article-form-page';

export default function EditArticlePageWrapper() {
  const params = useParams<{ id?: string }>();

  if (!featureFlags.knowledgeBase.enabled()) {
    notFound();
  }

  const id = typeof params?.id === 'string' ? params.id : null;
  return <ArticleFormPage articleId={id} />;
}

export const dynamic = 'force-dynamic';
