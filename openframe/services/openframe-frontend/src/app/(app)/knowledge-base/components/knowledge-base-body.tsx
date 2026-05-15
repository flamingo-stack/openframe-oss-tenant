'use client';

import { BoxArchiveIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  type PageActionButton,
  PageLayout,
  TagSearchInput,
  type TagSearchOption,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { notFound } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { graphql, useFragment, useLazyLoadQuery, usePaginationFragment } from 'react-relay';
import type { knowledgeBaseBodyArticlesRelay_query$key as ArticlesFragmentKey } from '@/__generated__/knowledgeBaseBodyArticlesRelay_query.graphql';
import type { knowledgeBaseBodyArticlesRelayPaginationQuery as ArticlesPaginationQueryType } from '@/__generated__/knowledgeBaseBodyArticlesRelayPaginationQuery.graphql';
import type { knowledgeBaseBodyArticlesRelayQuery as ArticlesQueryType } from '@/__generated__/knowledgeBaseBodyArticlesRelayQuery.graphql';
import type { knowledgeBaseBodyFoldersRelay_query$key as FoldersFragmentKey } from '@/__generated__/knowledgeBaseBodyFoldersRelay_query.graphql';
import type { knowledgeBaseBodyFoldersRelayQuery as FoldersQueryType } from '@/__generated__/knowledgeBaseBodyFoldersRelayQuery.graphql';
import type { knowledgeBaseBodySubtreeRelay_query$key as SubtreeFragmentKey } from '@/__generated__/knowledgeBaseBodySubtreeRelay_query.graphql';
import type { knowledgeBaseBodySubtreeRelayPaginationQuery as SubtreePaginationQueryType } from '@/__generated__/knowledgeBaseBodySubtreeRelayPaginationQuery.graphql';
import type { knowledgeBaseBodySubtreeRelayQuery as SubtreeQueryType } from '@/__generated__/knowledgeBaseBodySubtreeRelayQuery.graphql';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { useKnowledgeBaseItem } from '../hooks/use-knowledge-base-item';
import {
  getKnowledgeBaseArticlesConnectionId,
  getKnowledgeBaseArticlesSubtreeConnectionId,
  getKnowledgeBaseFoldersConnectionId,
} from '../hooks/use-knowledge-base-items';
import { useFolderRowActions } from './folder-row-actions';
import {
  KNOWLEDGE_BASE_PAGE_SIZE,
  KnowledgeBaseItemsListView,
  KnowledgeBaseTableSkeleton,
  readKnowledgeBaseItems,
} from './knowledge-base-table';
import { KnowledgeBaseTagsRow, type SelectedKnowledgeBaseTag } from './knowledge-base-tags-row';
import { NewFolderModal } from './new-folder-modal';

interface KnowledgeBaseBackButton {
  label: string;
  onClick: () => void;
}

interface KnowledgeBaseBodyProps {
  parentId: string | null;
}

interface CurrentFolder {
  id: string;
  name: string;
  parentId: string | null;
}

interface KnowledgeBaseBodyShellProps {
  parentId: string | null;
  title: string;
  backButton?: KnowledgeBaseBackButton;
  currentFolder?: CurrentFolder;
  onCurrentFolderDeleted?: () => void;
}

const ROOT_TITLE = 'Knowledge Base';
// MAX_PAGE_SIZE on the backend; `queryFoldersOnly` returns all folders regardless,
// so this is a safe ceiling rather than a real page size.
const FOLDERS_PAGE_SIZE = 100;

function buildActions(parentId: string | null, onNewFolder: () => void): PageActionButton[] {
  const newArticleHref = parentId ? `/knowledge-base/new?folderId=${parentId}` : '/knowledge-base/new';
  const actions: PageActionButton[] = [
    {
      label: 'New Folder',
      onClick: onNewFolder,
      icon: <PlusCircleIcon size={24} className="size-[var(--icon-size-icon-size)] text-ods-text-secondary" />,
      variant: 'outline',
    },
    {
      label: 'Add Article',
      href: newArticleHref,
      icon: <PlusCircleIcon size={24} className="size-[var(--icon-size-icon-size)] text-ods-text-secondary" />,
      variant: 'outline',
    },
  ];
  if (parentId === null) {
    actions.unshift({
      label: 'Archive',
      href: '/knowledge-base/archive',
      icon: <BoxArchiveIcon className="size-[var(--icon-size-icon-size)] text-ods-text-secondary" />,
      variant: 'outline',
    });
  }
  return actions;
}

const knowledgeBaseBodyFoldersRelayQuery = graphql`
  query knowledgeBaseBodyFoldersRelayQuery($filter: KnowledgeBaseFilterInput, $search: String, $first: Int!) {
    ...knowledgeBaseBodyFoldersRelay_query @arguments(filter: $filter, search: $search, first: $first)
  }
`;

const knowledgeBaseBodyFoldersRelayFragment = graphql`
  fragment knowledgeBaseBodyFoldersRelay_query on Query
    @argumentDefinitions(
      filter: { type: "KnowledgeBaseFilterInput" }
      search: { type: "String" }
      first: { type: "Int", defaultValue: 100 }
    ) {
    knowledgeBaseItems(filter: $filter, search: $search, first: $first)
      @connection(key: "knowledgeBaseBodyFolders__knowledgeBaseItems", filters: ["filter", "search"]) {
      __id
      edges {
        node {
          ...knowledgeBaseTableRow_node
        }
      }
    }
  }
`;

const knowledgeBaseBodyArticlesRelayQuery = graphql`
  query knowledgeBaseBodyArticlesRelayQuery(
    $filter: KnowledgeBaseFilterInput
    $search: String
    $first: Int!
    $after: String
  ) {
    ...knowledgeBaseBodyArticlesRelay_query
      @arguments(filter: $filter, search: $search, first: $first, after: $after)
  }
`;

const knowledgeBaseBodyArticlesRelayFragment = graphql`
  fragment knowledgeBaseBodyArticlesRelay_query on Query
    @refetchable(queryName: "knowledgeBaseBodyArticlesRelayPaginationQuery")
    @argumentDefinitions(
      filter: { type: "KnowledgeBaseFilterInput" }
      search: { type: "String" }
      first: { type: "Int", defaultValue: 20 }
      after: { type: "String" }
    ) {
    knowledgeBaseItems(filter: $filter, search: $search, first: $first, after: $after)
      @connection(key: "knowledgeBaseBodyArticles__knowledgeBaseItems", filters: ["filter", "search"]) {
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
      filteredCount
    }
  }
`;

// Subtree path: when parentId + tagIds are both present, the backend `queryArticlesInSubtree`
// only fires if `type` is null. Routed through a separate cache so it can't leak into the
// per-type connections.
const knowledgeBaseBodySubtreeRelayQuery = graphql`
  query knowledgeBaseBodySubtreeRelayQuery(
    $filter: KnowledgeBaseFilterInput
    $search: String
    $first: Int!
    $after: String
  ) {
    ...knowledgeBaseBodySubtreeRelay_query
      @arguments(filter: $filter, search: $search, first: $first, after: $after)
  }
`;

const knowledgeBaseBodySubtreeRelayFragment = graphql`
  fragment knowledgeBaseBodySubtreeRelay_query on Query
    @refetchable(queryName: "knowledgeBaseBodySubtreeRelayPaginationQuery")
    @argumentDefinitions(
      filter: { type: "KnowledgeBaseFilterInput" }
      search: { type: "String" }
      first: { type: "Int", defaultValue: 20 }
      after: { type: "String" }
    ) {
    knowledgeBaseItems(filter: $filter, search: $search, first: $first, after: $after)
      @connection(key: "knowledgeBaseBodyArticlesSubtree__knowledgeBaseItems", filters: ["filter", "search"]) {
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
      filteredCount
    }
  }
`;

interface ContentProps {
  parentId: string | null;
  search: string;
  tagIds: ReadonlyArray<string>;
}

function FoldersAndArticlesContent({ parentId, search, tagIds }: ContentProps) {
  const { toast } = useToast();
  const normalizedTagIds = tagIds.length > 0 ? [...tagIds] : null;
  const normalizedSearch = search || null;

  const foldersRoot = useLazyLoadQuery<FoldersQueryType>(
    knowledgeBaseBodyFoldersRelayQuery,
    {
      filter: { parentId, type: 'FOLDER', tagIds: normalizedTagIds },
      search: normalizedSearch,
      first: FOLDERS_PAGE_SIZE,
    },
    { fetchPolicy: 'store-and-network' },
  );
  const foldersData = useFragment<FoldersFragmentKey>(
    knowledgeBaseBodyFoldersRelayFragment,
    foldersRoot as FoldersFragmentKey,
  );
  const folders = useMemo(
    () => readKnowledgeBaseItems(foldersData.knowledgeBaseItems.edges),
    [foldersData.knowledgeBaseItems.edges],
  );

  const articlesRoot = useLazyLoadQuery<ArticlesQueryType>(
    knowledgeBaseBodyArticlesRelayQuery,
    {
      filter: { parentId, type: 'ARTICLE', tagIds: normalizedTagIds },
      search: normalizedSearch,
      first: KNOWLEDGE_BASE_PAGE_SIZE,
      after: null,
    },
    { fetchPolicy: 'store-and-network' },
  );
  const {
    data: articlesData,
    loadNext,
    hasNext,
    isLoadingNext,
  } = usePaginationFragment<ArticlesPaginationQueryType, ArticlesFragmentKey>(
    knowledgeBaseBodyArticlesRelayFragment,
    articlesRoot as ArticlesFragmentKey,
  );
  const articles = useMemo(
    () => readKnowledgeBaseItems(articlesData.knowledgeBaseItems.edges),
    [articlesData.knowledgeBaseItems.edges],
  );

  const items = useMemo(() => [...folders, ...articles], [folders, articles]);
  const filteredCount = folders.length + articlesData.knowledgeBaseItems.filteredCount;

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

  const foldersConnectionId = getKnowledgeBaseFoldersConnectionId({
    parentId,
    search: normalizedSearch,
    tagIds,
  });
  const articlesConnectionId = getKnowledgeBaseArticlesConnectionId({
    parentId,
    search: normalizedSearch,
    tagIds,
  });

  return (
    <KnowledgeBaseItemsListView
      mode="standard"
      items={items}
      filteredCount={filteredCount}
      foldersConnectionId={foldersConnectionId}
      articlesConnectionId={articlesConnectionId}
      hasNext={hasNext}
      isLoadingNext={isLoadingNext}
      onLoadMore={onLoadMore}
      emptyMessage="No knowledge base items found."
    />
  );
}

function SubtreeArticlesContent({ parentId, search, tagIds }: ContentProps) {
  const { toast } = useToast();
  const normalizedTagIds = tagIds.length > 0 ? [...tagIds] : null;
  const normalizedSearch = search || null;

  const subtreeRoot = useLazyLoadQuery<SubtreeQueryType>(
    knowledgeBaseBodySubtreeRelayQuery,
    {
      filter: { parentId, type: null, tagIds: normalizedTagIds },
      search: normalizedSearch,
      first: KNOWLEDGE_BASE_PAGE_SIZE,
      after: null,
    },
    { fetchPolicy: 'store-and-network' },
  );
  const {
    data: subtreeData,
    loadNext,
    hasNext,
    isLoadingNext,
  } = usePaginationFragment<SubtreePaginationQueryType, SubtreeFragmentKey>(
    knowledgeBaseBodySubtreeRelayFragment,
    subtreeRoot as SubtreeFragmentKey,
  );

  const items = useMemo(
    () => readKnowledgeBaseItems(subtreeData.knowledgeBaseItems.edges),
    [subtreeData.knowledgeBaseItems.edges],
  );
  const filteredCount = subtreeData.knowledgeBaseItems.filteredCount;

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

  const articlesConnectionId = getKnowledgeBaseArticlesSubtreeConnectionId({
    parentId,
    search: normalizedSearch,
    tagIds,
  });

  return (
    <KnowledgeBaseItemsListView
      mode="standard"
      items={items}
      filteredCount={filteredCount}
      foldersConnectionId={null}
      articlesConnectionId={articlesConnectionId}
      hasNext={hasNext}
      isLoadingNext={isLoadingNext}
      onLoadMore={onLoadMore}
      emptyMessage="No matching articles in this subtree."
    />
  );
}

function KnowledgeBaseBodyShell({
  parentId,
  title,
  backButton,
  currentFolder,
  onCurrentFolderDeleted,
}: KnowledgeBaseBodyShellProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedTags, setSelectedTags] = useState<SelectedKnowledgeBaseTag[]>([]);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);

  const tagIds = useMemo(() => selectedTags.map(t => t.id), [selectedTags]);
  const isSubtreeMode = parentId !== null && tagIds.length > 0;

  const newFolderConnectionId = getKnowledgeBaseFoldersConnectionId({
    parentId,
    search: null,
    tagIds: [],
  });

  const currentFolderParentConnectionId = getKnowledgeBaseFoldersConnectionId({
    parentId: currentFolder?.parentId ?? null,
    search: null,
    tagIds: [],
  });
  const folderActions = useFolderRowActions({
    sourceConnectionId: currentFolderParentConnectionId,
    onDeleted: onCurrentFolderDeleted,
  });
  const menuActions = currentFolder
    ? folderActions.buildMenuGroups({ id: currentFolder.id, name: currentFolder.name })
    : undefined;

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

  return (
    <PageLayout
      title={title}
      backButton={backButton}
      actionsVariant="menu-primary"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      actions={buildActions(parentId, () => setIsNewFolderOpen(true))}
      menuActions={menuActions}
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

      <Suspense fallback={<KnowledgeBaseTableSkeleton />}>
        {isSubtreeMode ? (
          <SubtreeArticlesContent parentId={parentId} search={debouncedSearch} tagIds={tagIds} />
        ) : (
          <FoldersAndArticlesContent parentId={parentId} search={debouncedSearch} tagIds={tagIds} />
        )}
      </Suspense>

      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        parentFolderId={parentId}
        parentConnectionId={newFolderConnectionId}
      />

      {currentFolder && folderActions.modals}
    </PageLayout>
  );
}

function RootBodyContent() {
  return <KnowledgeBaseBodyShell parentId={null} title={ROOT_TITLE} />;
}

function FolderBodyContent({ parentId }: { parentId: string }) {
  const folder = useKnowledgeBaseItem(parentId);
  const parentUrl = folder?.parentId ? `/knowledge-base/folders/${folder.parentId}` : '/knowledge-base';
  const handleBack = useSafeBack(parentUrl);

  if (!folder || folder.type !== 'FOLDER') {
    notFound();
  }

  const backButton: KnowledgeBaseBackButton = { label: 'Back', onClick: handleBack };
  const currentFolder: CurrentFolder = {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId ?? null,
  };

  return (
    <KnowledgeBaseBodyShell
      parentId={parentId}
      title={folder.name}
      backButton={backButton}
      currentFolder={currentFolder}
      onCurrentFolderDeleted={handleBack}
    />
  );
}

function KnowledgeBaseBodyFallback({ parentId }: KnowledgeBaseBodyProps) {
  const handleBack = useSafeBack('/knowledge-base');
  const title = parentId === null ? ROOT_TITLE : ' ';
  const backButton: KnowledgeBaseBackButton | undefined =
    parentId === null ? undefined : { label: 'Back', onClick: handleBack };

  return (
    <PageLayout
      title={title}
      backButton={backButton}
      actionsVariant="menu-primary"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      actions={buildActions(parentId, () => {})}
    >
      <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
        <TagSearchInput<string>
          tags={[]}
          searchValue=""
          onSearchChange={() => {}}
          onTagRemove={() => {}}
          onClearAll={() => {}}
          placeholder="Search for Articles"
          addMorePlaceholder="Search for Articles"
        />

        <KnowledgeBaseTagsRow parentId={parentId} selectedIds={[]} onAdd={() => {}} />
      </div>

      <KnowledgeBaseTableSkeleton />
    </PageLayout>
  );
}

export function KnowledgeBaseBody({ parentId }: KnowledgeBaseBodyProps) {
  return (
    <Suspense fallback={<KnowledgeBaseBodyFallback parentId={parentId} />}>
      {parentId === null ? <RootBodyContent /> : <FolderBodyContent parentId={parentId} />}
    </Suspense>
  );
}
