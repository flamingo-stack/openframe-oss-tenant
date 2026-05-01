'use client';

import {
  BookTextIcon,
  BoxArchiveIcon,
  Chevron02RightIcon,
  FolderEditIcon,
  FolderIcon,
  PenEditIcon,
  TrashIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuGroup,
  Button,
  type ColumnDef,
  DataTable,
  type Row,
  Tag as StatusTag,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay';
import { readInlineData } from 'relay-runtime';
import type { archivedArticlesTableRelay_query$key as ArchivedFragmentKey } from '@/__generated__/archivedArticlesTableRelay_query.graphql';
import type { archivedArticlesTableRelayPaginationQuery as ArchivedPaginationQueryType } from '@/__generated__/archivedArticlesTableRelayPaginationQuery.graphql';
import type { archivedArticlesTableRelayQuery as ArchivedQueryType } from '@/__generated__/archivedArticlesTableRelayQuery.graphql';
import type { knowledgeBaseTableRelay_query$key as KnowledgeBaseFragmentKey } from '@/__generated__/knowledgeBaseTableRelay_query.graphql';
import type { knowledgeBaseTableRelayPaginationQuery as KnowledgeBasePaginationQueryType } from '@/__generated__/knowledgeBaseTableRelayPaginationQuery.graphql';
import type { knowledgeBaseTableRelayQuery as KnowledgeBaseQueryType } from '@/__generated__/knowledgeBaseTableRelayQuery.graphql';
import type {
  knowledgeBaseTableRow_node$data,
  knowledgeBaseTableRow_node$key,
} from '@/__generated__/knowledgeBaseTableRow_node.graphql';
import { formatDate, formatTime } from '@/lib/format-date';
import { getArchivedArticlesConnectionId } from '../hooks/use-archived-articles';
import {
  getKnowledgeBaseItemsConnectionId,
  KNOWLEDGE_BASE_TABLE_CONNECTION_KEY,
} from '../hooks/use-knowledge-base-items';
import { ArchiveArticleModal, type ArchiveArticleTarget } from './archive-article-modal';
import { DeleteFolderModal, type DeleteFolderTarget } from './delete-folder-modal';
import { MoveToFolderModal, type MoveToFolderItem } from './move-to-folder-modal';
import { RenameFolderModal, type RenameFolderTarget } from './rename-folder-modal';
import { UnarchiveArticleModal, type UnarchiveArticleTarget } from './unarchive-article-modal';

// ----------------------------------------------------------------
// Shared row fragment — both queries spread this so the row shape
// stays in one place. @inline lets the parent read field data
// without per-row useFragment subscriptions.
// ----------------------------------------------------------------

const knowledgeBaseTableRowFragment = graphql`
  fragment knowledgeBaseTableRow_node on KnowledgeBaseItem @inline {
    id
    type
    name
    parentId
    status
    summary
    createdAt
    updatedAt
    tags {
      id
      key
      color
    }
  }
`;

type ItemNode = knowledgeBaseTableRow_node$data;

// ----------------------------------------------------------------
// Standard items list (knowledgeBaseItems) — query + connection
// ----------------------------------------------------------------

const PAGE_SIZE = 20;

const knowledgeBaseTableRelayQuery = graphql`
  query knowledgeBaseTableRelayQuery(
    $filter: KnowledgeBaseFilterInput
    $search: String
    $first: Int!
    $after: String
  ) {
    ...knowledgeBaseTableRelay_query
      @arguments(filter: $filter, search: $search, first: $first, after: $after)
  }
`;

const knowledgeBaseTableRelayFragment = graphql`
  fragment knowledgeBaseTableRelay_query on Query
    @refetchable(queryName: "knowledgeBaseTableRelayPaginationQuery")
    @argumentDefinitions(
      filter: { type: "KnowledgeBaseFilterInput" }
      search: { type: "String" }
      first: { type: "Int", defaultValue: 20 }
      after: { type: "String" }
    ) {
    knowledgeBaseItems(filter: $filter, search: $search, first: $first, after: $after)
      @connection(key: "knowledgeBaseTable_knowledgeBaseItems", filters: ["filter", "search"]) {
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

// ----------------------------------------------------------------
// Archived articles list (archivedArticles) — query + connection
// ----------------------------------------------------------------

const archivedArticlesTableRelayQuery = graphql`
  query archivedArticlesTableRelayQuery($search: String, $tagIds: [ID], $first: Int!, $after: String) {
    ...archivedArticlesTableRelay_query @arguments(search: $search, tagIds: $tagIds, first: $first, after: $after)
  }
`;

const archivedArticlesTableRelayFragment = graphql`
  fragment archivedArticlesTableRelay_query on Query
    @refetchable(queryName: "archivedArticlesTableRelayPaginationQuery")
    @argumentDefinitions(
      search: { type: "String" }
      tagIds: { type: "[ID]" }
      first: { type: "Int", defaultValue: 20 }
      after: { type: "String" }
    ) {
    archivedArticles(search: $search, tagIds: $tagIds, first: $first, after: $after)
      @connection(key: "archivedArticlesTable_archivedArticles", filters: ["search", "tagIds"]) {
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

// ----------------------------------------------------------------
// Shared presentation layer
// ----------------------------------------------------------------

type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

const STATUS_VARIANT: Record<ArticleStatus, 'success' | 'grey' | 'outline'> = {
  PUBLISHED: 'success',
  DRAFT: 'grey',
  ARCHIVED: 'outline',
};

type Mode = 'standard' | 'archive';

interface ListViewProps {
  items: ItemNode[];
  /** Connection ID for the list this view is rendering. Mutations use this to invalidate cache. */
  connectionId: string;
  hasNext: boolean;
  isLoadingNext: boolean;
  onLoadMore: () => void;
  mode: Mode;
  emptyMessage: string;
}

function KnowledgeBaseItemsListView({
  items,
  connectionId,
  hasNext,
  isLoadingNext,
  onLoadMore,
  mode,
  emptyMessage,
}: ListViewProps) {
  // Modal state — only the modals relevant to the current mode are mounted.
  const [renameTarget, setRenameTarget] = useState<RenameFolderTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveToFolderItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteFolderTarget | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ArchiveArticleTarget | null>(null);
  const [unarchiveTarget, setUnarchiveTarget] = useState<UnarchiveArticleTarget | null>(null);

  const renderRowActions = useCallback(
    (item: ItemNode) => {
      if (mode === 'archive') {
        return (
          <ActionsMenuDropdown
            groups={[
              {
                items: [
                  {
                    id: 'unarchive',
                    label: 'Unarchive',
                    icon: <BoxArchiveIcon className="w-6 h-6 text-ods-text-secondary" />,
                    onClick: () => setUnarchiveTarget({ id: item.id, name: item.name }),
                  },
                ],
              },
            ]}
          />
        );
      }

      const groups: ActionsMenuGroup[] =
        item.type === 'FOLDER'
          ? [
              {
                items: [
                  {
                    id: 'rename',
                    label: 'Rename',
                    icon: <PenEditIcon className="w-6 h-6 text-ods-text-secondary" />,
                    onClick: () => setRenameTarget({ id: item.id, name: item.name }),
                  },
                  {
                    id: 'move',
                    label: 'Move folder',
                    icon: <FolderEditIcon className="w-6 h-6 text-ods-text-secondary" />,
                    onClick: () => setMoveTarget({ id: item.id, name: item.name, type: 'folder' }),
                  },
                  {
                    id: 'delete',
                    label: 'Delete',
                    icon: <TrashIcon className="w-6 h-6 text-ods-text-secondary" />,
                    onClick: () => setDeleteTarget({ id: item.id, name: item.name }),
                  },
                ],
              },
            ]
          : [
              {
                items: [
                  {
                    id: 'edit',
                    label: 'Edit',
                    icon: <PenEditIcon className="w-6 h-6 text-ods-text-secondary" />,
                    href: `/knowledge-base/edit/${item.id}`,
                  },
                  {
                    id: 'move',
                    label: 'Move to folder',
                    icon: <FolderEditIcon className="w-6 h-6 text-ods-text-secondary" />,
                    onClick: () => setMoveTarget({ id: item.id, name: item.name, type: 'article' }),
                  },
                  {
                    id: 'archive',
                    label: 'Archive',
                    icon: <BoxArchiveIcon className="w-6 h-6 text-ods-text-secondary" />,
                    onClick: () => setArchiveTarget({ id: item.id, name: item.name }),
                  },
                ],
              },
            ];

      return <ActionsMenuDropdown groups={groups} />;
    },
    [mode],
  );

  const columns = useMemo<ColumnDef<ItemNode>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }: { row: Row<ItemNode> }) => {
          const item = row.original;
          const Icon = item.type === 'FOLDER' ? FolderIcon : BookTextIcon;
          const status = item.status ? (item.status as ArticleStatus) : null;
          return (
            <div className="box-border content-stretch flex gap-[var(--spacing-system-m)] h-20 items-center justify-start py-0 relative shrink-0 w-full">
              <div className="flex h-8 w-8 items-center justify-center relative rounded-[6px] shrink-0 border border-ods-border">
                <Icon size={16} className="text-ods-text-secondary shrink-0" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-h4 text-ods-text-primary leading-[24px] overflow-ellipsis overflow-hidden whitespace-nowrap">
                  {item.name}
                </p>
                {item.type === 'ARTICLE' && item.summary && (
                  <p className="text-heading-5 text-ods-text-secondary line-clamp-1">{item.summary}</p>
                )}
              </div>
              {item.type === 'ARTICLE' && status && (
                <StatusTag variant={STATUS_VARIANT[status]} label={status} className="shrink-0" />
              )}
            </div>
          );
        },
        enableSorting: false,
        meta: { width: 'flex-1 min-w-0' },
      },
      {
        accessorKey: mode === 'archive' ? 'updatedAt' : 'createdAt',
        header: mode === 'archive' ? 'Archived' : 'Created',
        cell: ({ row }: { row: Row<ItemNode> }) => {
          if (row.original.type !== 'ARTICLE') return null;
          const ts = mode === 'archive' ? (row.original.updatedAt ?? row.original.createdAt) : row.original.createdAt;
          if (!ts) return null;
          return (
            <div className="flex flex-col whitespace-nowrap">
              <span className="text-h4 text-ods-text-primary">{formatDate(ts)}</span>
              <span className="text-heading-5 text-ods-text-secondary">{formatTime(ts)}</span>
            </div>
          );
        },
        enableSorting: false,
        meta: { width: 'w-[140px]', hideAt: 'lg' },
      },
      {
        id: 'actions',
        cell: ({ row }: { row: Row<ItemNode> }) => (
          <div data-no-row-click className="flex justify-end pointer-events-auto">
            {renderRowActions(row.original)}
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<ItemNode> }) => {
          const item = row.original;
          const href =
            item.type === 'ARTICLE' ? `/knowledge-base/details/${item.id}` : `/knowledge-base/folders/${item.id}`;
          return (
            <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
              <Button
                href={href}
                prefetch={false}
                variant="outline"
                size="icon"
                centerIcon={<Chevron02RightIcon className="w-5 h-5" />}
                aria-label={item.type === 'FOLDER' ? 'Open folder' : 'Open article'}
                className="bg-ods-card"
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [mode, renderRowActions],
  );

  const table = useDataTable<ItemNode>({
    data: items,
    columns,
    getRowId: (row: ItemNode) => row.id,
    enableSorting: false,
  });

  const rowHref = useCallback(
    (item: ItemNode) =>
      item.type === 'ARTICLE' ? `/knowledge-base/details/${item.id}` : `/knowledge-base/folders/${item.id}`,
    [],
  );

  return (
    <>
      <DataTable table={table}>
        <DataTable.Body emptyMessage={emptyMessage} rowHref={rowHref} />
        <DataTable.InfiniteFooter
          hasNextPage={hasNext}
          isFetchingNextPage={isLoadingNext}
          onLoadMore={onLoadMore}
          skeletonRows={2}
        />
      </DataTable>

      {mode === 'standard' && (
        <>
          <RenameFolderModal
            isOpen={renameTarget !== null}
            onClose={() => setRenameTarget(null)}
            folder={renameTarget}
          />
          <MoveToFolderModal
            isOpen={moveTarget !== null}
            onClose={() => setMoveTarget(null)}
            item={moveTarget}
            sourceConnectionId={connectionId}
          />
          <DeleteFolderModal
            isOpen={deleteTarget !== null}
            onClose={() => setDeleteTarget(null)}
            folder={deleteTarget}
            sourceConnectionId={connectionId}
          />
          <ArchiveArticleModal
            isOpen={archiveTarget !== null}
            onClose={() => setArchiveTarget(null)}
            article={archiveTarget}
            sourceConnectionId={connectionId}
          />
        </>
      )}

      {mode === 'archive' && (
        <UnarchiveArticleModal
          isOpen={unarchiveTarget !== null}
          onClose={() => setUnarchiveTarget(null)}
          article={unarchiveTarget}
          sourceConnectionId={connectionId}
        />
      )}
    </>
  );
}

// ----------------------------------------------------------------
// Shared skeleton + Suspense wrapper helper
// ----------------------------------------------------------------

function KnowledgeBaseTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
          key={idx}
          className="h-20 w-full rounded-[6px] bg-ods-card animate-pulse"
        />
      ))}
    </div>
  );
}

function readItems(
  edges: ReadonlyArray<{ readonly node: knowledgeBaseTableRow_node$key }> | null | undefined,
): ItemNode[] {
  if (!edges) return [];
  return edges.map(edge => readInlineData(knowledgeBaseTableRowFragment, edge.node));
}

// ----------------------------------------------------------------
// Standard items table (knowledgeBaseItems)
// ----------------------------------------------------------------

interface KnowledgeBaseTableProps {
  parentId: string | null;
  search: string;
  emptyMessage?: string;
}

function KnowledgeBaseTableContent({
  parentId,
  search,
  emptyMessage = 'No knowledge base items found.',
}: KnowledgeBaseTableProps) {
  const { toast } = useToast();

  const queryData = useLazyLoadQuery<KnowledgeBaseQueryType>(
    knowledgeBaseTableRelayQuery,
    {
      filter: { parentId },
      search: search || null,
      first: PAGE_SIZE,
      after: null,
    },
    { fetchPolicy: 'store-and-network' },
  );

  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment<
    KnowledgeBasePaginationQueryType,
    KnowledgeBaseFragmentKey
  >(knowledgeBaseTableRelayFragment, queryData);

  const items = useMemo(() => readItems(data.knowledgeBaseItems.edges), [data.knowledgeBaseItems.edges]);

  const onLoadMore = useCallback(() => {
    if (!hasNext || isLoadingNext) return;
    loadNext(PAGE_SIZE, {
      onComplete: err => {
        if (err) {
          toast({ title: 'Error loading more items', description: err.message, variant: 'destructive' });
        }
      },
    });
  }, [hasNext, isLoadingNext, loadNext, toast]);

  const connectionId = getKnowledgeBaseItemsConnectionId({ parentId, search: search || null });

  return (
    <KnowledgeBaseItemsListView
      items={items}
      connectionId={connectionId}
      hasNext={hasNext}
      isLoadingNext={isLoadingNext}
      onLoadMore={onLoadMore}
      mode="standard"
      emptyMessage={emptyMessage}
    />
  );
}

export function KnowledgeBaseTable(props: KnowledgeBaseTableProps) {
  return (
    <Suspense fallback={<KnowledgeBaseTableSkeleton />}>
      <KnowledgeBaseTableContent {...props} />
    </Suspense>
  );
}

// ----------------------------------------------------------------
// Archived articles table (archivedArticles)
// ----------------------------------------------------------------

interface ArchivedArticlesTableProps {
  search: string;
  emptyMessage?: string;
}

function ArchivedArticlesTableContent({
  search,
  emptyMessage = 'No archived articles.',
}: ArchivedArticlesTableProps) {
  const { toast } = useToast();

  const queryData = useLazyLoadQuery<ArchivedQueryType>(
    archivedArticlesTableRelayQuery,
    {
      search: search || null,
      tagIds: null,
      first: PAGE_SIZE,
      after: null,
    },
    { fetchPolicy: 'store-and-network' },
  );

  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment<
    ArchivedPaginationQueryType,
    ArchivedFragmentKey
  >(archivedArticlesTableRelayFragment, queryData);

  const items = useMemo(() => readItems(data.archivedArticles.edges), [data.archivedArticles.edges]);

  const onLoadMore = useCallback(() => {
    if (!hasNext || isLoadingNext) return;
    loadNext(PAGE_SIZE, {
      onComplete: err => {
        if (err) {
          toast({ title: 'Error loading more', description: err.message, variant: 'destructive' });
        }
      },
    });
  }, [hasNext, isLoadingNext, loadNext, toast]);

  const connectionId = getArchivedArticlesConnectionId({ search: search || null, tagIds: null });

  return (
    <KnowledgeBaseItemsListView
      items={items}
      connectionId={connectionId}
      hasNext={hasNext}
      isLoadingNext={isLoadingNext}
      onLoadMore={onLoadMore}
      mode="archive"
      emptyMessage={emptyMessage}
    />
  );
}

export function ArchivedArticlesTable(props: ArchivedArticlesTableProps) {
  return (
    <Suspense fallback={<KnowledgeBaseTableSkeleton />}>
      <ArchivedArticlesTableContent {...props} />
    </Suspense>
  );
}

export { KNOWLEDGE_BASE_TABLE_CONNECTION_KEY };
