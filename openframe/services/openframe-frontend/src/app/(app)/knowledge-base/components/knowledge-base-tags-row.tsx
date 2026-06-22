'use client';

import { Suspense } from 'react';
import { SelectableTagsRow, SelectableTagsRowSkeleton } from '@/app/components/shared';
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

export function KnowledgeBaseTagsRow(props: KnowledgeBaseTagsRowProps) {
  return (
    <Suspense fallback={<SelectableTagsRowSkeleton />}>
      <KnowledgeBaseTagsRowContent {...props} />
    </Suspense>
  );
}
