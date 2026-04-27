import {
  type ColumnDef,
  DeviceCardCompact,
  multiSelectFilterFn,
  type Row,
  SquareAvatar,
  TableTimestampCell,
  TicketStatusTag,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { getFullImageUrl } from '@/lib/image-url';
import type { ClientDialogOwner, Dialog } from '../types/dialog.types';

interface DialogTableColumnsOptions {
  organizationLookup?: Record<string, string>;
  isArchived?: boolean;
  dialogVersion?: string;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString();
}

export function getDialogTableColumns(options: DialogTableColumnsOptions = {}): ColumnDef<Dialog>[] {
  const { organizationLookup = {}, isArchived = false, dialogVersion } = options;
  const isV2 = dialogVersion === 'v2';

  const titleColumn: ColumnDef<Dialog> = {
    accessorKey: 'title',
    header: 'TITLE',
    cell: ({ row }: { row: Row<Dialog> }) => {
      const dialog = row.original;
      return isV2 ? (
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-h4 text-ods-text-primary truncate block">{dialog.title || 'Untitled Dialog'}</span>
          <span className="text-body-sm text-ods-text-secondary truncate block">
            {formatTimestamp(dialog.createdAt)}
          </span>
        </div>
      ) : (
        <span className="text-h4 text-ods-text-primary truncate block">{dialog.title || 'Untitled Dialog'}</span>
      );
    },
    meta: { width: 'w-[70%] md:flex-1 min-w-0' },
  };

  const sourceColumn: ColumnDef<Dialog> = {
    accessorKey: 'source',
    header: 'SOURCE',
    cell: ({ row }: { row: Row<Dialog> }) => {
      const dialog = row.original;
      const isClientOwner = 'machine' in (dialog.owner || {});
      const clientOwner = isClientOwner ? (dialog.owner as ClientDialogOwner) : null;
      const deviceName = dialog.deviceHostname || clientOwner?.machine?.hostname || clientOwner?.machine?.displayName;
      const organizationId = clientOwner?.machine?.organizationId;
      const organizationName =
        dialog.organizationName || (organizationId ? organizationLookup[organizationId] : undefined);

      return <DeviceCardCompact deviceName={deviceName || '—'} organization={organizationName} />;
    },
    enableSorting: false,
    meta: { hideAt: 'md' },
  };

  const middleColumn: ColumnDef<Dialog> = isV2
    ? {
        accessorKey: 'assignee',
        header: 'ASSIGNEE',
        cell: ({ row }: { row: Row<Dialog> }) => {
          const dialog = row.original;
          return dialog.assignedName ? (
            <div className="flex items-center gap-2 min-w-0">
              <SquareAvatar
                src={getFullImageUrl(dialog.assigneeImageUrl)}
                alt={dialog.assignedName}
                fallback={dialog.assignedName}
                size="sm"
                variant="round"
                className="shrink-0"
              />
              <span className="text-h4 text-ods-text-primary truncate">{dialog.assignedName}</span>
            </div>
          ) : (
            <span className="text-h4 text-ods-text-secondary">{'—'}</span>
          );
        },
        enableSorting: false,
        meta: { hideAt: 'lg' },
      }
    : {
        accessorKey: 'createdAt',
        header: 'CREATED',
        cell: ({ row }: { row: Row<Dialog> }) => (
          <TableTimestampCell timestamp={row.original.createdAt} id={row.original.id} />
        ),
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
            isV2
              ? { id: 'TECH_REQUIRED', value: 'TECH_REQUIRED', label: 'Tech Required' }
              : { id: 'ACTION_REQUIRED', value: 'ACTION_REQUIRED', label: 'Action Required' },
            { id: 'ON_HOLD', value: 'ON_HOLD', label: 'On Hold' },
            { id: 'RESOLVED', value: 'RESOLVED', label: 'Resolved' },
          ],
        },
      },
    }),
  };

  return [titleColumn, sourceColumn, middleColumn, statusColumn];
}
