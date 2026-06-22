'use client';

import { FilterModal } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Suspense, useMemo } from 'react';
import { useKnowledgeBaseTags } from '../hooks/use-knowledge-base-tags';
import type { SelectedKnowledgeBaseTag } from './knowledge-base-tags-row';

// Single FilterModal group id under which all knowledge-base tags are listed as
// checkbox options. Knowledge Base tags are flat (no key:value), so one group is enough.
const TAGS_GROUP_ID = 'tags';

interface KnowledgeBaseTagsFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId: string | null;
  /** Currently-applied tag ids (pre-checked when the modal opens). */
  selectedIds: ReadonlyArray<string>;
  archived?: boolean;
  /** Called on Apply with the full new selection (replace semantics). */
  onApply: (tags: SelectedKnowledgeBaseTag[]) => void;
}

function KnowledgeBaseTagsFilterModalContent({
  isOpen,
  onClose,
  parentId,
  selectedIds,
  archived,
  onApply,
}: KnowledgeBaseTagsFilterModalProps) {
  const tags = useKnowledgeBaseTags({ folderId: parentId, archived });

  const filterGroups = useMemo(
    () => [
      {
        id: TAGS_GROUP_ID,
        title: 'Tags',
        options: tags.map(tag => ({ id: tag.id, label: tag.key })),
      },
    ],
    [tags],
  );

  // FilterModal re-seeds its checkboxes from `currentFilters` each time it opens.
  const currentFilters = useMemo(() => ({ [TAGS_GROUP_ID]: [...selectedIds] }), [selectedIds]);

  const handleFilterChange = (filters: Record<string, string[]>) => {
    const selectedSet = new Set(filters[TAGS_GROUP_ID] ?? []);
    onApply(tags.filter(tag => selectedSet.has(tag.id)).map(tag => ({ id: tag.id, key: tag.key })));
  };

  return (
    <FilterModal
      isOpen={isOpen}
      onClose={onClose}
      title="Filter by Tags"
      filterGroups={filterGroups}
      currentFilters={currentFilters}
      onFilterChange={handleFilterChange}
      applyButtonText="Apply"
      resetButtonText="Reset"
      className="max-w-[600px]"
    />
  );
}

/**
 * Mobile tags filter for the knowledge base: a FilterModal listing all KnowledgeBase tags.
 * On Apply the selected tags replace the current selection and surface as chips in
 * the search field. Tag loading suspends, so the content is gated behind
 * Suspense (fallback null — the modal is hidden until tags resolve).
 */
export function KnowledgeBaseTagsFilterModal(props: KnowledgeBaseTagsFilterModalProps) {
  return (
    <Suspense fallback={null}>
      <KnowledgeBaseTagsFilterModalContent {...props} />
    </Suspense>
  );
}
