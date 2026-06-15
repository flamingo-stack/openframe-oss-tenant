'use client';

import type { Notification } from '@flamingo-stack/openframe-frontend-core';
import {
  ArrowRightUpIcon,
  CheckCircleIcon,
  TrashIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, type ColumnDef, type Row, SplitButton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { resolveNotificationAction } from '@/app/components/notifications/notification-navigation';
import { formatDate, formatTime } from '@/lib/format-date';

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
      cell: ({ row }: { row: Row<NotificationRow> }) => (
        <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
          <span className="text-h4 text-ods-text-primary">{formatTime(row.original.createdAt)}</span>
          <span className="text-h6 text-ods-text-secondary">{formatDate(row.original.createdAt)}</span>
        </div>
      ),
    },
    {
      id: 'action',
      header: '',
      enableSorting: false,
      meta: { width: 'w-[210px]', align: 'right' },
      cell: ({ row }: { row: Row<NotificationRow> }) => {
        const action = resolveNotificationAction(row.original.notification);
        if (!action) return null;
        return (
          <div data-no-row-click className="flex w-full justify-end">
            <SplitButton
              variant="outline"
              href={action.route}
              groupAriaLabel={action.label}
              iconAction={{
                icon: <ArrowRightUpIcon className="text-ods-text-secondary" />,
                'aria-label': `Open ${action.label} in new tab`,
                href: action.route,
                openInNewTab: true,
              }}
            >
              {action.label}
            </SplitButton>
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
