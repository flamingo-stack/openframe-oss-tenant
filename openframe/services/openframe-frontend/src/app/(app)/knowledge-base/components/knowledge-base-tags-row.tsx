'use client';

import { Tag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Suspense } from 'react';
import { useKnowledgeBaseTags } from '../hooks/use-knowledge-base-tags';

export interface SelectedKnowledgeBaseTag {
  id: string;
  key: string;
}

interface KnowledgeBaseTagsRowProps {
  parentId: string | null;
  selectedIds: ReadonlyArray<string>;
  onAdd: (tag: SelectedKnowledgeBaseTag) => void;
}

function KnowledgeBaseTagsRowContent({ parentId, selectedIds, onAdd }: KnowledgeBaseTagsRowProps) {
  const tags = useKnowledgeBaseTags(parentId);
  const selected = new Set(selectedIds);
  const available = tags.filter(t => !selected.has(t.id));

  if (available.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-[var(--spacing-system-xxs)]">
      {available.map(tag => (
        <Tag
          key={tag.id}
          variant="outline"
          label={tag.key}
          onClick={() => onAdd({ id: tag.id, key: tag.key })}
          className="cursor-pointer hover:bg-ods-bg-hover max-w-full"
          labelClassName="truncate"
        />
      ))}
    </div>
  );
}

function KnowledgeBaseTagsRowSkeleton() {
  return (
    <div className="flex flex-wrap gap-[var(--spacing-system-xxs)]">
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
