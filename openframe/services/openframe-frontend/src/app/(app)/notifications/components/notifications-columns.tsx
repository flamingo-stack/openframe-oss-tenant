'use client';

import type { Notification } from '@flamingo-stack/openframe-frontend-core';
import { CheckCircleIcon, TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, type ColumnDef, type Row } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { format } from 'date-fns';
import { resolveNotificationAction } from '@/app/components/notifications/notification-navigation';

export interface NotificationRow {
  id: string;
  title: string;
  description: string | null | undefined;
  createdAt: number;
  read: boolean;
  notification: Notification;
}

interface BuildColumnsArgs {
  rowVariant: 'unread' | 'read';
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function buildNotificationColumns({
  rowVariant,
  onMarkRead,
  onDelete,
}: BuildColumnsArgs): ColumnDef<NotificationRow>[] {
  return [
    {
      id: 'notification',
      accessorKey: 'title',
      header: 'Notification',
      enableSorting: false,
      meta: { width: 'flex-1 min-w-0' },
      cell: ({ row }: { row: Row<NotificationRow> }) => (
        <div className="flex min-w-0 flex-col gap-[var(--spacing-system-xxs)]">
          <span className="truncate text-h4 text-ods-text-primary">{row.original.title}</span>
          {row.original.description ? (
            <span className="truncate text-h6 text-ods-text-secondary">{row.original.description}</span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'time',
      accessorKey: 'createdAt',
      header: 'Time',
      enableSorting: false,
      meta: { width: 'w-[160px]' },
      cell: ({ row }: { row: Row<NotificationRow> }) => {
        const date = new Date(row.original.createdAt);
        return (
          <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
            <span className="text-h4 text-ods-text-primary">{format(date, 'hh:mm a')}</span>
            <span className="text-h6 text-ods-text-secondary">{format(date, 'dd/MM/yyyy')}</span>
          </div>
        );
      },
    },
    {
      id: 'action',
      header: '',
      enableSorting: false,
      meta: { width: 'w-[160px]', align: 'right' },
      cell: ({ row }: { row: Row<NotificationRow> }) => {
        const action = resolveNotificationAction(row.original.notification);
        if (!action) return null;
        return (
          <div data-no-row-click className="flex w-full justify-end">
            <Button variant="outline" className="w-full" href={action.route} openInNewTab>
              {action.label}
            </Button>
          </div>
        );
      },
    },
    {
      id: 'rowIcon',
      header: '',
      enableSorting: false,
      meta: { width: 'w-12 shrink-0', align: 'right' },
      cell: ({ row }: { row: Row<NotificationRow> }) => (
        <div data-no-row-click className="flex items-center justify-end">
          {rowVariant === 'unread' ? (
            <Button
              size="icon"
              variant="outline"
              aria-label="Mark as done"
              onClick={() => onMarkRead?.(row.original.id)}
              leftIcon={<CheckCircleIcon size={24} />}
            />
          ) : (
            <Button
              size="icon"
              variant="outline"
              aria-label="Delete notification"
              onClick={() => onDelete?.(row.original.id)}
              leftIcon={<TrashIcon size={24} className="text-ods-error" />}
            />
          )}
        </div>
      ),
    },
  ];
}
