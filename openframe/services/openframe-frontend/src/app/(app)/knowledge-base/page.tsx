'use client';

import { KnowledgeBaseView } from './components/knowledge-base-view';

export default function KnowledgeBasePage() {
  return <KnowledgeBaseView folderId={null} />;
}

export const dynamic = 'force-dynamic';
