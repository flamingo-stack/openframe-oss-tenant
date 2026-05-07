'use client';

import { notFound, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useKnowledgeBaseItem } from '../hooks/use-knowledge-base-item';
import { type KnowledgeBaseBackButton, KnowledgeBaseBody } from './knowledge-base-body';

interface KnowledgeBaseFolderViewProps {
  folderId: string;
}

function KnowledgeBaseFolderViewContent({ folderId }: KnowledgeBaseFolderViewProps) {
  const router = useRouter();
  const folder = useKnowledgeBaseItem(folderId);

  if (!folder || folder.type !== 'FOLDER') {
    notFound();
  }

  const backButton: KnowledgeBaseBackButton = {
    label: 'Back',
    onClick: () => router.push(folder.parentId ? `/knowledge-base/folders/${folder.parentId}` : '/knowledge-base'),
  };

  return <KnowledgeBaseBody parentId={folderId} title={folder.name} backButton={backButton} />;
}

function KnowledgeBaseFolderViewSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--spacing-system-mf)] p-[var(--spacing-system-lf)]">
      <div className="h-8 w-1/3 rounded bg-ods-card animate-pulse" />
      <div className="h-12 w-full rounded bg-ods-card animate-pulse" />
    </div>
  );
}

export function KnowledgeBaseFolderView({ folderId }: KnowledgeBaseFolderViewProps) {
  return (
    <Suspense fallback={<KnowledgeBaseFolderViewSkeleton />}>
      <KnowledgeBaseFolderViewContent folderId={folderId} />
    </Suspense>
  );
}
