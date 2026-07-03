'use client';

import { useSearchParams } from 'next/navigation';
import { ArticleFormPage } from '../components/article-form-page';

export default function EditArticlePage() {
  const id = useSearchParams().get('id');
  return <ArticleFormPage articleId={id} />;
}
