'use client';

import { PageLayout, TagSearchInput } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { notFound } from 'next/navigation';
import { ArchivedArticlesTable } from '@/app/(app)/knowledge-base/components/knowledge-base-table';
import { KnowledgeBaseTagsRow } from '@/app/(app)/knowledge-base/components/knowledge-base-tags-row';
import { useTagSearchState } from '@/app/(app)/knowledge-base/hooks/use-tag-search-state';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { featureFlags } from '@/lib/feature-flags';

export default function ArchivePage() {
  const handleBack = useSafeBack('/knowledge-base');
  const { search, debouncedSearch, setSearch, tagIds, tagSearchOptions, addTag, removeTag, clearAll } =
    useTagSearchState();

  if (!featureFlags.knowledgeBase.enabled()) {
    notFound();
  }

  const hasFilters = search.length > 0 || tagIds.length > 0;

  return (
    <PageLayout
      title="Archived Articles"
      backButton={{ label: 'Back', onClick: handleBack }}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
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
      />
    </PageLayout>
  );
}

export const dynamic = 'force-dynamic';
