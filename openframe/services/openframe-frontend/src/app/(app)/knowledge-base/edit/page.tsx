'use client';

import { useRequiredIdParam } from '@/app/hooks/use-required-id-param';
import { ArticleFormPage } from '../components/article-form-page';

export default function EditArticlePage() {
  const id = useRequiredIdParam('/knowledge-base', '/knowledge-base/new');
  if (!id) return null;
  return <ArticleFormPage articleId={id} />;
}
