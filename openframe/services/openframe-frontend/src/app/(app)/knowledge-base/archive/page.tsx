'use client';

import { PageLayout, TagSearchInput } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { ArchivedArticlesTable } from '@/app/(app)/knowledge-base/components/knowledge-base-table';
import { KnowledgeBaseTagsRow } from '@/app/(app)/knowledge-base/components/knowledge-base-tags-row';
import { useTagSearchState } from '@/app/(app)/knowledge-base/hooks/use-tag-search-state';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { routes } from '@/lib/routes';

export default function ArchivePage() {
  const handleBack = useSafeBack(routes.knowledgeBase.list);
  const { search, debouncedSearch, setSearch, tagIds, tagSearchOptions, addTag, removeTag, clearAll } =
    useTagSearchState();
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();

  const hasFilters = search.length > 0 || tagIds.length > 0;

  return (
    <PageLayout
      title="Archived Articles"
      backButton={{ label: 'Back', onClick: handleBack }}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <div style={containerStyle} className="flex flex-col">
        <div
          ref={toolbarRef}
          className="sticky top-0 z-20 flex flex-col gap-[var(--spacing-system-xxs)] bg-ods-bg -mx-[var(--spacing-system-l)] px-[var(--spacing-system-l)] pt-[var(--spacing-system-l)] pb-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]"
        >
          <TagSearchInput<string>
            tags={tagSearchOptions}
            searchValue={search}
            onSearchChange={setSearch}
            onTagRemove={removeTag}
            onClearAll={clearAll}
            placeholder="Search archived articles"
            addMorePlaceholder="Search archived articles"
          />

          <KnowledgeBaseTagsRow parentId={null} selectedIds={tagIds} onAdd={addTag} archived />
        </div>

        <ArchivedArticlesTable
          search={debouncedSearch}
          tagIds={tagIds}
          emptyMessage={hasFilters ? 'No archived articles match your filters.' : 'No archived articles.'}
          stickyHeaderOffset={stickyHeaderOffset}
        />
      </div>
    </PageLayout>
  );
}
