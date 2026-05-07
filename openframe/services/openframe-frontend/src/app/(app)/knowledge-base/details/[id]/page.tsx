'use client';

import { notFound, useParams } from 'next/navigation';
import { featureFlags } from '@/lib/feature-flags';
import { ArticleDetailsPage } from '../../components/article-details-page';

export default function ArticleDetailsPageWrapper() {
  const params = useParams<{ id?: string }>();

  if (!featureFlags.knowledgeBase.enabled()) {
    notFound();
  }

  const id = typeof params?.id === 'string' ? params.id : null;
  if (!id) {
    notFound();
  }

  return <ArticleDetailsPage articleId={id} />;
}

export const dynamic = 'force-dynamic';
