'use client';

import { useParams } from 'next/navigation';
import { ArticleFormPage } from '../../components/article-form-page';

export default function EditArticlePageWrapper() {
  const params = useParams<{ id?: string }>();

  const id = typeof params?.id === 'string' ? params.id : null;
  return <ArticleFormPage articleId={id} />;
}

export const dynamic = 'force-dynamic';
