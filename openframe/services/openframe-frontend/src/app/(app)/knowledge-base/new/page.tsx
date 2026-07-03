'use client';

import { useSearchParams } from 'next/navigation';
import { ArticleFormPage } from '../components/article-form-page';

export default function NewArticlePageWrapper() {
  const searchParams = useSearchParams();

  const folderId = searchParams.get('folderId');
  return <ArticleFormPage articleId={null} initialFolderId={folderId} />;
}
