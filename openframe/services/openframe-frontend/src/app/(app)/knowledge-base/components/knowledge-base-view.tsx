'use client';

import { KnowledgeBaseBody } from './knowledge-base-body';
import { KnowledgeBaseFolderView } from './knowledge-base-folder-view';

interface KnowledgeBaseViewProps {
  folderId: string | null;
}

export function KnowledgeBaseView({ folderId }: KnowledgeBaseViewProps) {
  if (folderId === null) {
    return <KnowledgeBaseBody parentId={null} title="Knowledge Base" />;
  }
  return <KnowledgeBaseFolderView folderId={folderId} />;
}
