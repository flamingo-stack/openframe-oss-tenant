'use client';

import { notFound } from 'next/navigation';
import { featureFlags } from '@/lib/feature-flags';
import { KnowledgeBaseView } from './components/knowledge-base-view';

export default function KnowledgeBasePage() {
  if (!featureFlags.knowledgeBase.enabled()) {
    notFound();
  }
  return <KnowledgeBaseView folderId={null} />;
}

export const dynamic = 'force-dynamic';
