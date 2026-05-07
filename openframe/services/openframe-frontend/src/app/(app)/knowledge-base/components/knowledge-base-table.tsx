'use client';

import {
  BoxArchiveIcon,
  FolderEditIcon,
  PenEditIcon,
  TrashIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuGroup,
  type ColumnDef,
  DataTable,
  type Row,
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
import { getArchivedArticlesConnectionId } from '../hooks/use-archived-articles';
import { ArchiveArticleModal, type ArchiveArticleTarget } from './archive-article-modal';
import { DeleteFolderModal, type DeleteFolderTarget } from './delete-folder-modal';
import { type KnowledgeBaseRow, KnowledgeBaseTableBody } from './knowledge-base-table-columns';
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

  const actionsColumn = useMemo<ColumnDef<KnowledgeBaseRow>>(
    () => ({
      id: 'actions',
      cell: ({ row }: { row: Row<KnowledgeBaseRow> }) => (
        <div data-no-row-click className="flex justify-end pointer-events-auto">
          {renderRowActions(row.original as ItemNode)}
        </div>
      ),
      enableSorting: false,
      meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
    }),
    [renderRowActions],
  );

  return (
    <>
      <KnowledgeBaseTableBody
        items={items as ReadonlyArray<KnowledgeBaseRow> as KnowledgeBaseRow[]}
        mode={mode}
        emptyMessage={emptyMessage}
        actionsColumn={actionsColumn}
        footerSlot={
          <DataTable.InfiniteFooter
            hasNextPage={hasNext}
            isFetchingNextPage={isLoadingNext}
            onLoadMore={onLoadMore}
            skeletonRows={2}
          />
        }
      />

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
