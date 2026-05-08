'use client';

import {
  ArrowRightUpIcon,
  BookTextIcon,
  FolderIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  type Row,
  Tag as StatusTag,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { type ReactNode, useMemo } from 'react';
import { formatDate, formatTime } from '@/lib/format-date';

export type KnowledgeBaseRowType = 'ARTICLE' | 'FOLDER' | string;
export type KnowledgeBaseRowStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string | null | undefined;

export interface KnowledgeBaseRow {
  readonly id: string;
  readonly type: KnowledgeBaseRowType;
  readonly name: string;
  readonly parentId?: string | null;
  readonly status?: KnowledgeBaseRowStatus;
  readonly summary?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly tags?: ReadonlyArray<{ readonly id: string; readonly key: string; readonly color?: string | null }>;
}

export type KnowledgeBaseTableMode = 'standard' | 'archive';

const STATUS_VARIANT: Record<'DRAFT' | 'ARCHIVED', 'warning' | 'grey'> = {
  DRAFT: 'warning',
  ARCHIVED: 'grey',
};

export const knowledgeBaseRowHref = (item: KnowledgeBaseRow): string =>
  item.type === 'ARTICLE' ? `/knowledge-base/details/${item.id}` : `/knowledge-base/folders/${item.id}`;

export const KNOWLEDGE_BASE_OPEN_COLUMN: ColumnDef<KnowledgeBaseRow> = {
  id: 'open',
  cell: ({ row }: { row: Row<KnowledgeBaseRow> }) => (
    <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
      <Button
        href={knowledgeBaseRowHref(row.original)}
        prefetch={false}
        openInNewTab
        variant="outline"
        size="icon"
        leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
        aria-label="Open in new tab"
        className="bg-ods-card"
      />
    </div>
  ),
  enableSorting: false,
  meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
};

export function getKnowledgeBaseColumns(mode: KnowledgeBaseTableMode): ColumnDef<KnowledgeBaseRow>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }: { row: Row<KnowledgeBaseRow> }) => {
        const item = row.original;
        const Icon = item.type === 'FOLDER' ? FolderIcon : BookTextIcon;
        const status = item.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | null | undefined;
        const tagStatus = status === 'DRAFT' || status === 'ARCHIVED' ? status : null;
        return (
          <div className="box-border content-stretch flex gap-[var(--spacing-system-m)] h-20 items-center justify-start py-0 relative shrink-0 w-full">
            <div className="flex h-8 w-8 items-center justify-center relative rounded-[6px] shrink-0 border border-ods-border">
              <Icon size={16} className="text-ods-text-secondary shrink-0" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-[var(--spacing-system-xsf)] min-w-0">
                <p className="text-h4 text-ods-text-primary leading-[24px] truncate">{item.name}</p>
                {tagStatus && <StatusTag variant={STATUS_VARIANT[tagStatus]} label={tagStatus} className="shrink-0" />}
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
      cell: ({ row }: { row: Row<KnowledgeBaseRow> }) => {
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
  ];
}

interface KnowledgeBaseTableBodyProps {
  items: KnowledgeBaseRow[];
  mode?: KnowledgeBaseTableMode;
  isLoading?: boolean;
  emptyMessage?: string;
  skeletonRows?: number;
  stickyHeaderOffset?: string;
  footerSlot?: ReactNode;
  actionsColumn?: ColumnDef<KnowledgeBaseRow>;
}

export function KnowledgeBaseTableBody({
  items,
  mode = 'standard',
  isLoading,
  emptyMessage = 'No items found.',
  skeletonRows,
  stickyHeaderOffset,
  footerSlot,
  actionsColumn,
}: KnowledgeBaseTableBodyProps) {
  const columns = useMemo<ColumnDef<KnowledgeBaseRow>[]>(() => {
    const base = getKnowledgeBaseColumns(mode);
    return actionsColumn ? [...base, actionsColumn, KNOWLEDGE_BASE_OPEN_COLUMN] : [...base, KNOWLEDGE_BASE_OPEN_COLUMN];
  }, [mode, actionsColumn]);

  const table = useDataTable<KnowledgeBaseRow>({
    data: items,
    columns,
    getRowId: row => row.id,
    enableSorting: false,
  });

  return (
    <DataTable table={table}>
      <DataTable.Header
        stickyHeader={!!stickyHeaderOffset}
        stickyHeaderOffset={stickyHeaderOffset}
        rightSlot={<DataTable.RowCount />}
      />
      <DataTable.Body
        loading={isLoading}
        skeletonRows={skeletonRows}
        emptyMessage={emptyMessage}
        rowHref={knowledgeBaseRowHref}
      />
      {footerSlot}
    </DataTable>
  );
}
