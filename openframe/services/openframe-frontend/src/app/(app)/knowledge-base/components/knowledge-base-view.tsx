'use client';

import { KnowledgeBaseBody } from './knowledge-base-body';

interface KnowledgeBaseViewProps {
  folderId: string | null;
}

export function KnowledgeBaseView({ folderId }: KnowledgeBaseViewProps) {
  return <KnowledgeBaseBody parentId={folderId} />;
}
