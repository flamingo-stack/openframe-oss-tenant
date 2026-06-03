'use client';

import { notFound, useParams } from 'next/navigation';
import { featureFlags } from '@/lib/feature-flags';
import { KnowledgeBaseView } from '../../components/knowledge-base-view';

export default function FolderPage() {
  const params = useParams<{ id?: string }>();

  if (!featureFlags.knowledgeBase.enabled()) {
    notFound();
  }

  const id = typeof params?.id === 'string' ? params.id : null;
  if (!id) {
    notFound();
  }

  return <KnowledgeBaseView folderId={id} />;
}

export const dynamic = 'force-dynamic';
