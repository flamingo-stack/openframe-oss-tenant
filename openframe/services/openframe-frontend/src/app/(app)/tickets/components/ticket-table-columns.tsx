import { ArrowRightUpIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  type ColumnFiltersState,
  DataTable,
  DeviceCardCompact,
  multiSelectFilterFn,
  type OnChangeFn,
  type Row,
  resolveStatusTagProps,
  SquareAvatar,
  TicketStatusTag,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { type ReactNode, useMemo } from 'react';
import { formatDateTime } from '@/lib/format-date';
import { getFullImageUrl } from '@/lib/image-url';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { routes } from '@/lib/routes';
import type { ClientDialogOwner, Dialog } from '../types/dialog.types';

export interface StatusFilterOption {
  id: string;
  value: string;
  label: string;
}

// Legacy status filter options (ticket-statuses feature flag OFF).
const LEGACY_STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { id: 'ACTIVE', value: 'ACTIVE', label: 'Active' },
  { id: 'TECH_REQUIRED', value: 'TECH_REQUIRED', label: 'Tech Required' },
  { id: 'ON_HOLD', value: 'ON_HOLD', label: 'On Hold' },
  { id: 'RESOLVED', value: 'RESOLVED', label: 'Resolved' },
];

interface TicketTableColumnsOptions {
  isArchived?: boolean;
  // Lifecycle status options (value = status id). Falls back to the legacy enum options when omitted.
  statusOptions?: StatusFilterOption[];
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return formatDateTime(date);
}

export function getTicketTableColumns(options: TicketTableColumnsOptions = {}): ColumnDef<Dialog>[] {
  const { isArchived = false, statusOptions } = options;

  const titleColumn: ColumnDef<Dialog> = {
    accessorKey: 'title',
    header: 'TITLE',
    cell: ({ row }: { row: Row<Dialog> }) => {
      const ticket = row.original;
      return (
        <div className="flex flex-col justify-center min-w-0">
          <TruncateText>{ticket.title || 'Untitled Ticket'}</TruncateText>
          <TruncateText variant="h6" tone="secondary">
            {formatTimestamp(ticket.createdAt)}
          </TruncateText>
        </div>
      );
    },
    meta: { width: 'w-[60%] md:flex-1 min-w-0' },
  };

  const sourceColumn: ColumnDef<Dialog> = {
    accessorKey: 'source',
    header: 'SOURCE',
    cell: ({ row }: { row: Row<Dialog> }) => {
      const ticket = row.original;
      const isClientOwner = 'machine' in (ticket.owner || {});
      const clientOwner = isClientOwner ? (ticket.owner as ClientDialogOwner) : null;
      const deviceName = ticket.deviceHostname || clientOwner?.machine?.hostname || clientOwner?.machine?.displayName;

      return <DeviceCardCompact deviceName={deviceName || '—'} organization={ticket.organizationName} />;
    },
    enableSorting: false,
    meta: { hideAt: 'md' },
  };

  const middleColumn: ColumnDef<Dialog> = {
    accessorKey: 'assignee',
    header: 'ASSIGNEE',
    cell: ({ row }: { row: Row<Dialog> }) => {
      const ticket = row.original;
      return ticket.assignedName ? (
        <div className="flex items-center gap-2 min-w-0">
          <SquareAvatar
            src={getFullImageUrl(ticket.assigneeImageUrl, ticket.assigneeImageHash)}
            alt={ticket.assignedName}
            fallback={ticket.assignedName}
            size="sm"
            variant="round"
            className="shrink-0"
          />
          <TruncateText>{ticket.assignedName}</TruncateText>
        </div>
      ) : (
        <span className="text-h4 text-ods-text-secondary">{'—'}</span>
      );
    },
    enableSorting: false,
    meta: { hideAt: 'lg' },
  };

  const statusColumn: ColumnDef<Dialog> = {
    accessorKey: 'status',
    header: 'STATUS',
    cell: ({ row }: { row: Row<Dialog> }) => <TicketStatusTag {...resolveStatusTagProps(row.original)} />,
    ...(!isArchived && {
      filterFn: multiSelectFilterFn,
      meta: {
        filter: {
          options: statusOptions ?? LEGACY_STATUS_FILTER_OPTIONS,
        },
      },
    }),
  };

  return [titleColumn, sourceColumn, middleColumn, statusColumn];
}

export const ticketRowHref = (ticket: Dialog): string => routes.tickets.dialog(ticket.id);

export function getTicketOpenColumn(getUnreadCount?: (ticket: Dialog) => number | undefined): ColumnDef<Dialog> {
  return {
    id: 'open',
    cell: ({ row }: { row: Row<Dialog> }) => {
      // This trailing slot shows the unread-message count when there is one, otherwise the open action.
      const unread = getUnreadCount?.(row.original);
      if (unread) {
        return (
          <span
            className="inline-flex h-12 min-w-12 items-center justify-center rounded-md bg-ods-accent px-[var(--spacing-system-xsf)] text-h3 font-bold text-ods-text-on-accent"
            aria-label={`${unread} unread ${unread === 1 ? 'message' : 'messages'}`}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        );
      }
      return (
        <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
          <Button
            onClick={openInNewTab(ticketRowHref(row.original))}
            variant="outline"
            size="icon"
            leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
            aria-label="Open in new tab"
            className="bg-ods-card"
          />
        </div>
      );
    },
    enableSorting: false,
    meta: { width: 'w-12 shrink-0 flex-none', hideAt: 'md', align: 'right' },
  };
}

interface TicketTableBodyProps {
  tickets: Dialog[];
  isLoading?: boolean;
  emptyMessage?: string;
  skeletonRows?: number;
  stickyHeaderOffset?: string;
  footerSlot?: ReactNode;
  isArchived?: boolean;
  actionsColumn?: ColumnDef<Dialog>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  statusOptions?: StatusFilterOption[];
  getUnreadCount?: (ticket: Dialog) => number | undefined;
}

export function TicketTableBody({
  tickets,
  isLoading,
  emptyMessage = 'No tickets found.',
  skeletonRows,
  stickyHeaderOffset,
  footerSlot,
  isArchived,
  actionsColumn,
  columnFilters,
  onColumnFiltersChange,
  statusOptions,
  getUnreadCount,
}: TicketTableBodyProps) {
  const columns = useMemo<ColumnDef<Dialog>[]>(() => {
    const base = getTicketTableColumns({ isArchived, statusOptions });
    const openColumn = getTicketOpenColumn(getUnreadCount);
    return actionsColumn ? [...base, actionsColumn, openColumn] : [...base, openColumn];
  }, [isArchived, actionsColumn, statusOptions, getUnreadCount]);

  const table = useDataTable<Dialog>({
    data: tickets,
    columns,
    getRowId: row => String(row.id),
    enableSorting: false,
    state: columnFilters !== undefined ? { columnFilters } : undefined,
    onColumnFiltersChange,
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
        rowClassName="mb-1"
        rowHref={ticketRowHref}
      />
      {footerSlot}
    </DataTable>
  );
}
