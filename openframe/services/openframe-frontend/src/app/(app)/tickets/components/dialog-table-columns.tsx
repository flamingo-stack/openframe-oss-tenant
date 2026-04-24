import {
  DeviceCardCompact,
  SquareAvatar,
  type TableColumn,
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

export function getDialogTableColumns(options: DialogTableColumnsOptions = {}): TableColumn<Dialog>[] {
  const { organizationLookup = {}, isArchived = false, dialogVersion } = options;
  const isV2 = dialogVersion === 'v2';
  return [
    {
      key: 'title',
      label: 'TITLE',
      width: 'w-[70%] md:flex-1 min-w-0',
      renderCell: dialog =>
        isV2 ? (
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-h4 text-ods-text-primary truncate block">{dialog.title || 'Untitled Dialog'}</span>
            <span className="text-body-sm text-ods-text-secondary truncate block">
              {formatTimestamp(dialog.createdAt)}
            </span>
          </div>
        ) : (
          <span className="text-h4 text-ods-text-primary truncate block">{dialog.title || 'Untitled Dialog'}</span>
        ),
    },
    {
      key: 'source',
      label: 'SOURCE',
      hideAt: 'md',
      renderCell: dialog => {
        const isClientOwner = 'machine' in (dialog.owner || {});
        const clientOwner = isClientOwner ? (dialog.owner as ClientDialogOwner) : null;
        const deviceName = dialog.deviceHostname || clientOwner?.machine?.hostname || clientOwner?.machine?.displayName;
        const organizationId = clientOwner?.machine?.organizationId;
        const organizationName =
          dialog.organizationName || (organizationId ? organizationLookup[organizationId] : undefined);

        return <DeviceCardCompact deviceName={deviceName || '\u2014'} organization={organizationName} />;
      },
    },
    isV2
      ? {
          key: 'assignee',
          label: 'ASSIGNEE',
          hideAt: 'lg',
          renderCell: (dialog: Dialog) =>
            dialog.assignedName ? (
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
              <span className="text-h4 text-ods-text-secondary">{'\u2014'}</span>
            ),
        }
      : {
          key: 'createdAt',
          label: 'CREATED',
          hideAt: 'lg',
          renderCell: (dialog: Dialog) => <TableTimestampCell timestamp={dialog.createdAt} id={dialog.id} />,
        },
    {
      key: 'status',
      label: 'STATUS',
      filterable: !isArchived,
      filterOptions: !isArchived
        ? [
            { id: 'ACTIVE', value: 'ACTIVE', label: 'Active' },
            isV2
              ? { id: 'TECH_REQUIRED', value: 'TECH_REQUIRED', label: 'Tech Required' }
              : { id: 'ACTION_REQUIRED', value: 'ACTION_REQUIRED', label: 'Action Required' },
            { id: 'ON_HOLD', value: 'ON_HOLD', label: 'On Hold' },
            { id: 'RESOLVED', value: 'RESOLVED', label: 'Resolved' },
          ]
        : undefined,
      renderCell: dialog => <TicketStatusTag status={dialog.status} />,
    },
  ];
}
