'use client';

import { BoxArchiveIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  PageLayout,
  TagSearchInput,
  type TagSearchOption,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay';
import type { knowledgeBaseBodyRelay_query$key as KnowledgeBaseBodyFragmentKey } from '@/__generated__/knowledgeBaseBodyRelay_query.graphql';
import type { knowledgeBaseBodyRelayPaginationQuery as KnowledgeBaseBodyPaginationQueryType } from '@/__generated__/knowledgeBaseBodyRelayPaginationQuery.graphql';
import type { knowledgeBaseBodyRelayQuery as KnowledgeBaseBodyQueryType } from '@/__generated__/knowledgeBaseBodyRelayQuery.graphql';
import { getKnowledgeBaseItemsConnectionId } from '../hooks/use-knowledge-base-items';
import {
  KNOWLEDGE_BASE_PAGE_SIZE,
  KnowledgeBaseItemsListView,
  KnowledgeBaseTableSkeleton,
  readKnowledgeBaseItems,
} from './knowledge-base-table';
import { KnowledgeBaseTagsRow, type SelectedKnowledgeBaseTag } from './knowledge-base-tags-row';
import { NewFolderModal } from './new-folder-modal';

export interface KnowledgeBaseBackButton {
  label: string;
  onClick: () => void;
}

export interface KnowledgeBaseBodyProps {
  parentId: string | null;
  title: string;
  backButton?: KnowledgeBaseBackButton;
}

const knowledgeBaseBodyRelayQuery = graphql`
  query knowledgeBaseBodyRelayQuery(
    $filter: KnowledgeBaseFilterInput
    $search: String
    $first: Int!
    $after: String
  ) {
    ...knowledgeBaseBodyRelay_query
      @arguments(filter: $filter, search: $search, first: $first, after: $after)
  }
`;

const knowledgeBaseBodyRelayFragment = graphql`
  fragment knowledgeBaseBodyRelay_query on Query
    @refetchable(queryName: "knowledgeBaseBodyRelayPaginationQuery")
    @argumentDefinitions(
      filter: { type: "KnowledgeBaseFilterInput" }
      search: { type: "String" }
      first: { type: "Int", defaultValue: 20 }
      after: { type: "String" }
    ) {
    knowledgeBaseItems(filter: $filter, search: $search, first: $first, after: $after)
      @connection(key: "knowledgeBaseBody_knowledgeBaseItems", filters: ["filter", "search"]) {
      __id
      edges {
        node {
          ...knowledgeBaseTableRow_node
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function KnowledgeBaseBodyContent({ parentId, title, backButton }: KnowledgeBaseBodyProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedTags, setSelectedTags] = useState<SelectedKnowledgeBaseTag[]>([]);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);

  const tagIds = useMemo(() => selectedTags.map(t => t.id), [selectedTags]);
  const normalizedTagIds = tagIds.length > 0 ? tagIds : null;

  const queryData = useLazyLoadQuery<KnowledgeBaseBodyQueryType>(
    knowledgeBaseBodyRelayQuery,
    {
      filter: { parentId, tagIds: normalizedTagIds },
      search: debouncedSearch || null,
      first: KNOWLEDGE_BASE_PAGE_SIZE,
      after: null,
    },
    { fetchPolicy: 'store-and-network' },
  );

  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment<
    KnowledgeBaseBodyPaginationQueryType,
    KnowledgeBaseBodyFragmentKey
  >(knowledgeBaseBodyRelayFragment, queryData);

  const items = useMemo(() => readKnowledgeBaseItems(data.knowledgeBaseItems.edges), [data.knowledgeBaseItems.edges]);
  const isEmpty = items.length === 0;

  const onLoadMore = useCallback(() => {
    if (!hasNext || isLoadingNext) return;
    loadNext(KNOWLEDGE_BASE_PAGE_SIZE, {
      onComplete: err => {
        if (err) {
          toast({ title: 'Error loading more items', description: err.message, variant: 'destructive' });
        }
      },
    });
  }, [hasNext, isLoadingNext, loadNext, toast]);

  const connectionId = getKnowledgeBaseItemsConnectionId({
    parentId,
    search: debouncedSearch || null,
    tagIds,
  });

  const newFolderConnectionId = getKnowledgeBaseItemsConnectionId({
    parentId,
    search: null,
    tagIds: [],
  });

  const tagSearchOptions = useMemo<TagSearchOption<string>[]>(
    () => selectedTags.map(t => ({ label: t.key, value: t.id })),
    [selectedTags],
  );

  const addTag = useCallback((tag: SelectedKnowledgeBaseTag) => {
    setSelectedTags(prev => (prev.some(t => t.id === tag.id) ? prev : [...prev, tag]));
  }, []);

  const removeTag = useCallback((id: string) => {
    setSelectedTags(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setSearch('');
    setSelectedTags([]);
  }, []);

  const newArticleHref = parentId ? `/knowledge-base/new?folderId=${parentId}` : '/knowledge-base/new';

  return (
    <PageLayout
      title={title}
      backButton={backButton}
      actionsVariant="primary-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      actions={[
        {
          label: 'Archive',
          href: '/knowledge-base/archive',
          icon: <BoxArchiveIcon size={24} className="text-ods-text-secondary" />,
          variant: 'outline',
        },
        {
          label: 'New Folder',
          onClick: () => setIsNewFolderOpen(true),
          icon: <PlusCircleIcon size={24} className="text-ods-text-secondary" />,
          variant: 'outline',
        },
        {
          label: 'Add Article',
          href: newArticleHref,
          icon: <PlusCircleIcon size={24} className="text-ods-text-secondary" />,
          variant: isEmpty ? 'accent' : 'outline',
        },
      ]}
    >
      <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
        <TagSearchInput<string>
          tags={tagSearchOptions}
          searchValue={search}
          onSearchChange={setSearch}
          onTagRemove={removeTag}
          onClearAll={clearAll}
          placeholder="Search for Articles"
          addMorePlaceholder="Search for Articles"
        />

        <KnowledgeBaseTagsRow parentId={parentId} selectedIds={tagIds} onAdd={addTag} />
      </div>

      <KnowledgeBaseItemsListView
        items={items}
        connectionId={connectionId}
        hasNext={hasNext}
        isLoadingNext={isLoadingNext}
        onLoadMore={onLoadMore}
        mode="standard"
        emptyMessage="No knowledge base items found."
      />

      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        parentFolderId={parentId}
        parentConnectionId={newFolderConnectionId}
      />
    </PageLayout>
  );
}

function KnowledgeBaseBodyFallback({ title, backButton }: KnowledgeBaseBodyProps) {
  return (
    <PageLayout
      title={title}
      backButton={backButton}
      actionsVariant="primary-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      actions={[]}
    >
      <KnowledgeBaseTableSkeleton />
    </PageLayout>
  );
}

export function KnowledgeBaseBody(props: KnowledgeBaseBodyProps) {
  return (
    <Suspense fallback={<KnowledgeBaseBodyFallback {...props} />}>
      <KnowledgeBaseBodyContent {...props} />
    </Suspense>
  );
}
