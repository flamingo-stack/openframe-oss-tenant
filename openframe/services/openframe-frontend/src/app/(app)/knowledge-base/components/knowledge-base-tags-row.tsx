'use client';

import { Suspense } from 'react';
import { SelectableTagsRow } from '@/app/components/shared';
import { useKnowledgeBaseTags } from '../hooks/use-knowledge-base-tags';

export interface SelectedKnowledgeBaseTag {
  id: string;
  key: string;
}

interface KnowledgeBaseTagsRowProps {
  parentId: string | null;
  selectedIds: ReadonlyArray<string>;
  onAdd: (tag: SelectedKnowledgeBaseTag) => void;
  archived?: boolean;
}

function KnowledgeBaseTagsRowContent({ parentId, selectedIds, onAdd, archived }: KnowledgeBaseTagsRowProps) {
  const tags = useKnowledgeBaseTags({ folderId: parentId, archived });
  return <SelectableTagsRow tags={tags} selectedIds={selectedIds} onAdd={onAdd} />;
}

function KnowledgeBaseTagsRowSkeleton() {
  return (
    <div className="flex gap-[var(--spacing-system-xxs)] overflow-hidden">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="h-8 w-20 rounded-[6px] bg-ods-card animate-pulse" />
      ))}
    </div>
  );
}

export function KnowledgeBaseTagsRow(props: KnowledgeBaseTagsRowProps) {
  return (
    <Suspense fallback={<KnowledgeBaseTagsRowSkeleton />}>
      <KnowledgeBaseTagsRowContent {...props} />
    </Suspense>
  );
}
