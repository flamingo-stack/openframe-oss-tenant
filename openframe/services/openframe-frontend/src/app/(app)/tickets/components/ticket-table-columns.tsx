import { ArrowRightUpIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  DeviceCardCompact,
  multiSelectFilterFn,
  type Row,
  SquareAvatar,
  TicketStatusTag,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { type ReactNode, useMemo } from 'react';
import { formatDateTime } from '@/lib/format-date';
import { getFullImageUrl } from '@/lib/image-url';
import type { ClientDialogOwner, Dialog } from '../types/dialog.types';

interface TicketTableColumnsOptions {
  isArchived?: boolean;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return formatDateTime(date);
}

export function getTicketTableColumns(options: TicketTableColumnsOptions = {}): ColumnDef<Dialog>[] {
  const { isArchived = false } = options;

  const titleColumn: ColumnDef<Dialog> = {
    accessorKey: 'title',
    header: 'TITLE',
    cell: ({ row }: { row: Row<Dialog> }) => {
      const ticket = row.original;
      return (
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-h4 text-ods-text-primary truncate block">{ticket.title || 'Untitled Ticket'}</span>
          <span className="text-body-sm text-ods-text-secondary truncate block">
            {formatTimestamp(ticket.createdAt)}
          </span>
        </div>
      );
    },
    meta: { width: 'w-[70%] md:flex-1 min-w-0' },
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
            src={getFullImageUrl(ticket.assigneeImageUrl)}
            alt={ticket.assignedName}
            fallback={ticket.assignedName}
            size="sm"
            variant="round"
            className="shrink-0"
          />
          <span className="text-h4 text-ods-text-primary truncate">{ticket.assignedName}</span>
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
    cell: ({ row }: { row: Row<Dialog> }) => <TicketStatusTag status={row.original.status} />,
    ...(!isArchived && {
      filterFn: multiSelectFilterFn,
      meta: {
        filter: {
          options: [
            { id: 'ACTIVE', value: 'ACTIVE', label: 'Active' },
            { id: 'TECH_REQUIRED', value: 'TECH_REQUIRED', label: 'Tech Required' },
            { id: 'ON_HOLD', value: 'ON_HOLD', label: 'On Hold' },
            { id: 'RESOLVED', value: 'RESOLVED', label: 'Resolved' },
          ],
        },
      },
    }),
  };

  return [titleColumn, sourceColumn, middleColumn, statusColumn];
}

export const ticketRowHref = (ticket: Dialog): string => `/tickets/dialog?id=${ticket.id}`;

export const TICKET_OPEN_COLUMN: ColumnDef<Dialog> = {
  id: 'open',
  cell: ({ row }: { row: Row<Dialog> }) => (
    <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
      <Button
        href={ticketRowHref(row.original)}
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

interface TicketTableBodyProps {
  tickets: Dialog[];
  isLoading?: boolean;
  emptyMessage?: string;
  skeletonRows?: number;
  stickyHeaderOffset?: string;
  footerSlot?: ReactNode;
  isArchived?: boolean;
  actionsColumn?: ColumnDef<Dialog>;
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
}: TicketTableBodyProps) {
  const columns = useMemo<ColumnDef<Dialog>[]>(() => {
    const base = getTicketTableColumns({ isArchived });
    return actionsColumn ? [...base, actionsColumn, TICKET_OPEN_COLUMN] : [...base, TICKET_OPEN_COLUMN];
  }, [isArchived, actionsColumn]);

  const table = useDataTable<Dialog>({
    data: tickets,
    columns,
    getRowId: row => String(row.id),
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
        rowClassName="mb-1"
        rowHref={ticketRowHref}
      />
      {footerSlot}
    </DataTable>
  );
}
