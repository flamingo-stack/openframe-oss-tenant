'use client';

import { notFound, useSearchParams } from 'next/navigation';
import { ArticleDetailsPage } from '../components/article-details-page';

export default function ArticleDetailsPageWrapper() {
  const id = useSearchParams().get('id');
  if (!id) {
    notFound();
  }
  return <ArticleDetailsPage articleId={id} />;
}
