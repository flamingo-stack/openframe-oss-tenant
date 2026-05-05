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
import type { knowledgeBaseTableArchivedRelay_query$key as ArchivedFragmentKey } from '@/__generated__/knowledgeBaseTableArchivedRelay_query.graphql';
import type { knowledgeBaseTableArchivedRelayPaginationQuery as ArchivedPaginationQueryType } from '@/__generated__/knowledgeBaseTableArchivedRelayPaginationQuery.graphql';
import type { knowledgeBaseTableArchivedRelayQuery as ArchivedQueryType } from '@/__generated__/knowledgeBaseTableArchivedRelayQuery.graphql';
import type {
  knowledgeBaseTableRow_node$data,
  knowledgeBaseTableRow_node$key,
} from '@/__generated__/knowledgeBaseTableRow_node.graphql';
import { formatDate, formatTime } from '@/lib/format-date';
import { getArchivedArticlesConnectionId } from '../hooks/use-archived-articles';
import { ArchiveArticleModal, type ArchiveArticleTarget } from './archive-article-modal';
import { DeleteFolderModal, type DeleteFolderTarget } from './delete-folder-modal';
import { type MoveToFolderItem, MoveToFolderModal } from './move-to-folder-modal';
import { RenameFolderModal, type RenameFolderTarget } from './rename-folder-modal';
import { UnarchiveArticleModal, type UnarchiveArticleTarget } from './unarchive-article-modal';

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

export type ItemNode = knowledgeBaseTableRow_node$data;

export const KNOWLEDGE_BASE_PAGE_SIZE = 20;

const archivedArticlesTableRelayQuery = graphql`
  query knowledgeBaseTableArchivedRelayQuery($search: String, $tagIds: [ID], $first: Int!, $after: String) {
    ...knowledgeBaseTableArchivedRelay_query
      @arguments(search: $search, tagIds: $tagIds, first: $first, after: $after)
  }
`;

const archivedArticlesTableRelayFragment = graphql`
  fragment knowledgeBaseTableArchivedRelay_query on Query
    @refetchable(queryName: "knowledgeBaseTableArchivedRelayPaginationQuery")
    @argumentDefinitions(
      search: { type: "String" }
      tagIds: { type: "[ID]" }
      first: { type: "Int", defaultValue: 20 }
      after: { type: "String" }
    ) {
    archivedArticles(search: $search, tagIds: $tagIds, first: $first, after: $after)
      @connection(key: "knowledgeBaseTable_archivedArticles", filters: ["search", "tagIds"]) {
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

type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

const STATUS_VARIANT: Record<Exclude<ArticleStatus, 'PUBLISHED'>, 'warning' | 'grey'> = {
  DRAFT: 'warning',
  ARCHIVED: 'grey',
};

type Mode = 'standard' | 'archive';

export interface ListViewProps {
  items: ItemNode[];
  connectionId: string;
  hasNext: boolean;
  isLoadingNext: boolean;
  onLoadMore: () => void;
  mode: Mode;
  emptyMessage: string;
}

export function KnowledgeBaseItemsListView({
  items,
  connectionId,
  hasNext,
  isLoadingNext,
  onLoadMore,
  mode,
  emptyMessage,
}: ListViewProps) {
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
          const status = item.status as ArticleStatus | null | undefined;
          const tagStatus = status === 'DRAFT' || status === 'ARCHIVED' ? status : null;
          return (
            <div className="box-border content-stretch flex gap-[var(--spacing-system-m)] h-20 items-center justify-start py-0 relative shrink-0 w-full">
              <div className="flex h-8 w-8 items-center justify-center relative rounded-[6px] shrink-0 border border-ods-border">
                <Icon size={16} className="text-ods-text-secondary shrink-0" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-[var(--spacing-system-xsf)] min-w-0">
                  <p className="text-h4 text-ods-text-primary leading-[24px] truncate">{item.name}</p>
                  {tagStatus && (
                    <StatusTag variant={STATUS_VARIANT[tagStatus]} label={tagStatus} className="shrink-0" />
                  )}
                </div>
                {item.type === 'ARTICLE' && item.summary && (
                  <p className="text-heading-5 text-ods-text-secondary line-clamp-1">{item.summary}</p>
                )}
              </div>
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
                aria-label={item.type === 'FOLDER' ? 'Open folder' : 'Open article'}
                className="bg-ods-card"
              >
                <Chevron02RightIcon className="w-5 h-5" />
              </Button>
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

export function KnowledgeBaseTableSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--spacing-system-xsf)]">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="h-20 w-full rounded-[6px] bg-ods-card animate-pulse" />
      ))}
    </div>
  );
}

export function readKnowledgeBaseItems(
  edges: ReadonlyArray<{ readonly node: knowledgeBaseTableRow_node$key }> | null | undefined,
): ItemNode[] {
  if (!edges) return [];
  return edges.map(edge => readInlineData(knowledgeBaseTableRowFragment, edge.node));
}

interface ArchivedArticlesTableProps {
  search: string;
  emptyMessage?: string;
}

function ArchivedArticlesTableContent({ search, emptyMessage = 'No archived articles.' }: ArchivedArticlesTableProps) {
  const { toast } = useToast();

  const queryData = useLazyLoadQuery<ArchivedQueryType>(
    archivedArticlesTableRelayQuery,
    {
      search: search || null,
      tagIds: null,
      first: KNOWLEDGE_BASE_PAGE_SIZE,
      after: null,
    },
    { fetchPolicy: 'store-and-network' },
  );

  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment<
    ArchivedPaginationQueryType,
    ArchivedFragmentKey
  >(archivedArticlesTableRelayFragment, queryData);

  const items = useMemo(() => readKnowledgeBaseItems(data.archivedArticles.edges), [data.archivedArticles.edges]);

  const onLoadMore = useCallback(() => {
    if (!hasNext || isLoadingNext) return;
    loadNext(KNOWLEDGE_BASE_PAGE_SIZE, {
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
