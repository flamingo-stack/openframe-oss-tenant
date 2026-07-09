'use client';

import type { Notification, NotificationSeverity } from '@flamingo-stack/openframe-frontend-core';
import {
  ArrowRightUpIcon,
  CheckCircleIcon,
  TrashIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  dotColorByVariant,
  type Row,
  SplitButton,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn, formatTicketRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { getNotificationCategoryIcon } from '@/app/components/notifications/notification-category-icons';
import { resolveNotificationAction } from '@/app/components/notifications/notification-navigation';
import { openMingoDialogInDrawer } from '@/app/components/notifications/open-mingo-dialog';

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

/** Row label color per the Figma table row: DANGER red, WARNING amber, SUCCESS green, INFO/default primary. */
const titleColorBySeverity: Partial<Record<NotificationSeverity, string>> = {
  DANGER: 'text-ods-error',
  WARNING: 'text-ods-warning',
  SUCCESS: 'text-ods-success',
};

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
      meta: { width: 'flex-[2] min-w-0' },
      cell: ({ row }: { row: Row<NotificationRow> }) => {
        const { category, type, severity, variant = 'default' } = row.original.notification;
        return (
          <div className="flex min-w-0 items-center gap-[var(--spacing-system-m)]">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-ods-border text-ods-text-secondary">
              {getNotificationCategoryIcon(category) ?? (
                <span className={cn('size-1.5 rounded-full', dotColorByVariant[variant])} />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-[var(--spacing-system-xxs)]">
              <span
                className={cn(
                  'truncate text-h4',
                  (severity && titleColorBySeverity[severity]) ?? 'text-ods-text-primary',
                )}
              >
                {/* Context-derived kind label; title stands in when the context is generic. */}
                {type ?? row.original.title}
              </span>
              <span className="truncate text-h6 text-ods-text-secondary">
                {formatTicketRelativeTime(new Date(row.original.createdAt).toISOString())}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'details',
      accessorKey: 'description',
      header: '',
      enableSorting: false,
      meta: { width: 'flex-[3] min-w-0' },
      cell: ({ row }: { row: Row<NotificationRow> }) => {
        // The title moves here only when the kind label owns the first column;
        // otherwise it's already shown there and only the description remains.
        const showTitle = !!row.original.notification.type;
        return (
          <div className="flex min-w-0 flex-col">
            {showTitle ? <span className="truncate text-h4 text-ods-text-primary">{row.original.title}</span> : null}
            {row.original.description ? (
              <span className="line-clamp-3 break-words text-h6 text-ods-text-secondary">
                {row.original.description}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'action',
      header: '',
      enableSorting: false,
      meta: { width: 'w-[210px]', align: 'right' },
      cell: ({ row }: { row: Row<NotificationRow> }) => {
        const action = resolveNotificationAction(row.original.notification);
        if (!action) return null;
        // A Mingo dialog has no URL (it lives in the in-layout drawer once the
        // `/mingo` page is retired), so it opens via click instead of an href +
        // new tab. Route actions keep the open-in-new-tab anchor behavior.
        const isRoute = 'route' in action;
        // Opening clears unread (the drawer has no URL, so the location-based
        // auto-reader can't). `onMarkRead` is only wired for the unread
        // variant; it's a no-op for already-read rows.
        const openDrawer = isRoute
          ? undefined
          : () => {
              openMingoDialogInDrawer(action.mingoDialogId);
              onMarkRead?.(row.original.id);
            };
        return (
          <div data-no-row-click className="flex w-full justify-end">
            <SplitButton
              variant="outline"
              href={isRoute ? action.route : undefined}
              onClick={openDrawer}
              groupAriaLabel={action.label}
              iconAction={{
                icon: <ArrowRightUpIcon className="text-ods-text-secondary" />,
                'aria-label': isRoute ? `Open ${action.label} in new tab` : `Open ${action.label}`,
                href: isRoute ? action.route : undefined,
                onClick: openDrawer,
                openInNewTab: isRoute,
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
