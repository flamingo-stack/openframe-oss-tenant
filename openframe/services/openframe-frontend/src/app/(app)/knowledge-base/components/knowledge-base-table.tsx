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
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useMemo } from 'react';
import { formatDate, formatTime } from '@/lib/format-date';
import type { KnowledgeBaseItem } from '../mock-data';

interface KnowledgeBaseTableProps {
  items: KnowledgeBaseItem[];
  emptyMessage?: string;
}

export function KnowledgeBaseTable({
  items,
  emptyMessage = 'No knowledge base items found.',
}: KnowledgeBaseTableProps) {
  const { toast } = useToast();

  const renderRowActions = useCallback(
    (item: KnowledgeBaseItem) => {
      const groups: ActionsMenuGroup[] =
        item.type === 'folder'
          ? [
              {
                items: [
                  {
                    id: 'rename',
                    label: 'Rename',
                    icon: <PenEditIcon className="w-6 h-6 text-ods-text-secondary" />,
                    onClick: () => toast({ title: 'Rename folder', description: 'Coming soon', variant: 'default' }),
                  },
                  {
                    id: 'move',
                    label: 'Move folder',
                    icon: <FolderEditIcon className="w-6 h-6 text-ods-text-secondary" />,
                    onClick: () => toast({ title: 'Move folder', description: 'Coming soon', variant: 'default' }),
                  },
                  {
                    id: 'delete',
                    label: 'Delete',
                    icon: <TrashIcon className="w-6 h-6 text-ods-text-secondary" />,
                    onClick: () => toast({ title: 'Delete folder', description: 'Coming soon', variant: 'default' }),
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
                    onClick: () => toast({ title: 'Move to folder', description: 'Coming soon', variant: 'default' }),
                  },
                  {
                    id: 'archive',
                    label: 'Archive',
                    icon: <BoxArchiveIcon className="w-6 h-6 text-ods-text-secondary" />,
                    onClick: () => toast({ title: 'Archive article', description: 'Coming soon', variant: 'default' }),
                  },
                ],
              },
            ];

      return <ActionsMenuDropdown groups={groups} />;
    },
    [toast],
  );

  const columns = useMemo<ColumnDef<KnowledgeBaseItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }: { row: Row<KnowledgeBaseItem> }) => {
          const item = row.original;
          const Icon = item.type === 'folder' ? FolderIcon : BookTextIcon;
          return (
            <div className="box-border content-stretch flex gap-[var(--spacing-system-m)] h-20 items-center justify-start py-0 relative shrink-0 w-full">
              <div className="flex h-8 w-8 items-center justify-center relative rounded-[6px] shrink-0 border border-ods-border">
                <Icon size={16} className="text-ods-text-secondary shrink-0" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-h4 text-ods-text-primary leading-[24px] overflow-ellipsis overflow-hidden whitespace-nowrap">
                  {item.name}
                </p>
                {item.type === 'article' && (
                  <p className="text-heading-5 text-ods-text-secondary line-clamp-1">{item.description}</p>
                )}
              </div>
            </div>
          );
        },
        enableSorting: false,
        meta: { width: 'flex-1 min-w-0' },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }: { row: Row<KnowledgeBaseItem> }) => {
          if (row.original.type !== 'article') {
            return null;
          }
          return (
            <div className="flex flex-col whitespace-nowrap">
              <span className="text-h4 text-ods-text-primary">{formatDate(row.original.createdAt)}</span>
              <span className="text-heading-5 text-ods-text-secondary">{formatTime(row.original.createdAt)}</span>
            </div>
          );
        },
        enableSorting: false,
        meta: { width: 'w-[140px]', hideAt: 'lg' },
      },
      {
        id: 'actions',
        cell: ({ row }: { row: Row<KnowledgeBaseItem> }) => (
          <div data-no-row-click className="flex justify-end pointer-events-auto">
            {renderRowActions(row.original)}
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<KnowledgeBaseItem> }) => {
          const item = row.original;
          const href =
            item.type === 'article' ? `/knowledge-base/details/${item.id}` : `/knowledge-base/folders/${item.id}`;
          return (
            <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
              <Button
                href={href}
                prefetch={false}
                variant="outline"
                size="icon"
                centerIcon={<Chevron02RightIcon className="w-5 h-5" />}
                aria-label={item.type === 'folder' ? 'Open folder' : 'Open article'}
                className="bg-ods-card"
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [renderRowActions],
  );

  const table = useDataTable<KnowledgeBaseItem>({
    data: items,
    columns,
    getRowId: (row: KnowledgeBaseItem) => row.id,
    enableSorting: false,
  });

  const rowHref = useCallback(
    (item: KnowledgeBaseItem) =>
      item.type === 'article' ? `/knowledge-base/details/${item.id}` : `/knowledge-base/folders/${item.id}`,
    [],
  );

  return (
    <DataTable table={table}>
      <DataTable.Body emptyMessage={emptyMessage} rowHref={rowHref} />
    </DataTable>
  );
}
