'use client';

import {
  BoxArchiveIcon,
  FolderEditIcon,
  PenEditIcon,
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
import { useFolderRowActions } from './folder-row-actions';
import { type KnowledgeBaseRow, KnowledgeBaseTableBody } from './knowledge-base-table-columns';
import { type MoveToFolderItem, MoveToFolderModal } from './move-to-folder-modal';
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
      filteredCount
    }
  }
`;

interface BaseListViewProps {
  items: ItemNode[];
  filteredCount: number;
  hasNext: boolean;
  isLoadingNext: boolean;
  onLoadMore: () => void;
  emptyMessage: string;
}

interface StandardListViewProps extends BaseListViewProps {
  mode: 'standard';
  foldersConnectionId: string | null;
  articlesConnectionId: string;
}

interface ArchiveListViewProps extends BaseListViewProps {
  mode: 'archive';
  archivedConnectionId: string;
}

export type ListViewProps = StandardListViewProps | ArchiveListViewProps;

export function KnowledgeBaseItemsListView(props: ListViewProps) {
  const { items, filteredCount, hasNext, isLoadingNext, onLoadMore, emptyMessage, mode } = props;
  const standardProps = mode === 'standard' ? (props as StandardListViewProps) : null;
  const folderActions = useFolderRowActions({
    sourceConnectionId: standardProps?.foldersConnectionId ?? '',
  });
  const [moveArticleTarget, setMoveArticleTarget] = useState<MoveToFolderItem | null>(null);
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
                    icon: <BoxArchiveIcon className="size-[var(--icon-size-icon-size)] text-ods-text-secondary" />,
                    onClick: () => setUnarchiveTarget({ id: item.id, name: item.name }),
                  },
                ],
              },
            ]}
          />
        );
      }

      const isFolder = item.type === 'FOLDER';

      const groups: ActionsMenuGroup[] = isFolder
        ? folderActions.buildMenuGroups({ id: item.id, name: item.name })
        : [
            {
              items: [
                {
                  id: 'edit',
                  label: 'Edit',
                  icon: <PenEditIcon className="size-[var(--icon-size-icon-size)] text-ods-text-secondary" />,
                  href: `/knowledge-base/edit/${item.id}`,
                },
                {
                  id: 'move',
                  label: 'Move to folder',
                  icon: <FolderEditIcon className="size-[var(--icon-size-icon-size)] text-ods-text-secondary" />,
                  onClick: () => setMoveArticleTarget({ id: item.id, name: item.name, type: 'article' }),
                },
                {
                  id: 'archive',
                  label: 'Archive',
                  icon: <BoxArchiveIcon className="size-[var(--icon-size-icon-size)] text-ods-text-secondary" />,
                  onClick: () => setArchiveTarget({ id: item.id, name: item.name }),
                },
              ],
            },
          ];

      return <ActionsMenuDropdown groups={groups} />;
    },
    [mode, folderActions.buildMenuGroups],
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

  const isStandard = mode === 'standard';
  const archivedConnectionId = !isStandard ? (props as ArchiveListViewProps).archivedConnectionId : null;

  return (
    <>
      <KnowledgeBaseTableBody
        items={items as ReadonlyArray<KnowledgeBaseRow> as KnowledgeBaseRow[]}
        mode={mode}
        emptyMessage={emptyMessage}
        actionsColumn={actionsColumn}
        totalCount={filteredCount}
        footerSlot={
          <DataTable.InfiniteFooter
            hasNextPage={hasNext}
            isFetchingNextPage={isLoadingNext}
            onLoadMore={onLoadMore}
            skeletonRows={2}
          />
        }
      />

      {isStandard && standardProps && (
        <>
          {folderActions.modals}
          <MoveToFolderModal
            isOpen={moveArticleTarget !== null}
            onClose={() => setMoveArticleTarget(null)}
            item={moveArticleTarget}
            sourceConnectionId={standardProps.articlesConnectionId}
          />
          <ArchiveArticleModal
            isOpen={archiveTarget !== null}
            onClose={() => setArchiveTarget(null)}
            article={archiveTarget}
            sourceConnectionId={standardProps.articlesConnectionId}
          />
        </>
      )}

      {!isStandard && archivedConnectionId && (
        <UnarchiveArticleModal
          isOpen={unarchiveTarget !== null}
          onClose={() => setUnarchiveTarget(null)}
          article={unarchiveTarget}
          sourceConnectionId={archivedConnectionId}
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
  const filteredCount = data.archivedArticles.filteredCount;

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

  const archivedConnectionId = getArchivedArticlesConnectionId({ search: search || null, tagIds: null });

  return (
    <KnowledgeBaseItemsListView
      mode="archive"
      items={items}
      filteredCount={filteredCount}
      archivedConnectionId={archivedConnectionId}
      hasNext={hasNext}
      isLoadingNext={isLoadingNext}
      onLoadMore={onLoadMore}
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
