'use client';

import { notFound, useSearchParams } from 'next/navigation';
import { KnowledgeBaseView } from '../components/knowledge-base-view';

export default function FolderPage() {
  const id = useSearchParams().get('id');
  if (!id) {
    notFound();
  }
  return <KnowledgeBaseView folderId={id} />;
}
