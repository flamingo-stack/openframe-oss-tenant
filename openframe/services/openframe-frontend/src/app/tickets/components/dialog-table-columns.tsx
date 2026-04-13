import {
  DeviceCardCompact,
  type TableColumn,
  TableTimestampCell,
  TicketStatusTag,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ClientDialogOwner, Dialog } from '../types/dialog.types';

interface DialogTableColumnsOptions {
  organizationLookup?: Record<string, string>;
  isArchived?: boolean;
}

export function getDialogTableColumns(options: DialogTableColumnsOptions = {}): TableColumn<Dialog>[] {
  const { organizationLookup = {}, isArchived = false } = options;
  return [
    {
      key: 'title',
      label: 'TITLE',
      width: 'w-[70%] md:flex-1 min-w-0',
      renderCell: dialog => (
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
        const deviceName = clientOwner?.machine?.displayName || clientOwner?.machine?.hostname || dialog.deviceHostname;
        const organizationId = clientOwner?.machine?.organizationId;
        const organizationName =
          dialog.organizationName || (organizationId ? organizationLookup[organizationId] : undefined);

        return <DeviceCardCompact deviceName={deviceName || 'Unknown Device'} organization={organizationName} />;
      },
    },
    {
      key: 'createdAt',
      label: 'CREATED',
      hideAt: 'lg',
      renderCell: dialog => <TableTimestampCell timestamp={dialog.createdAt} id={dialog.id} />,
    },
    {
      key: 'status',
      label: 'STATUS',
      filterable: !isArchived,
      filterOptions: !isArchived
        ? [
            { id: 'ACTIVE', value: 'ACTIVE', label: 'Active' },
            {
              id: 'ACTION_REQUIRED',
              value: 'ACTION_REQUIRED',
              label: 'Action Required',
            },
            { id: 'ON_HOLD', value: 'ON_HOLD', label: 'On Hold' },
            { id: 'RESOLVED', value: 'RESOLVED', label: 'Resolved' },
          ]
        : undefined,
      renderCell: dialog => <TicketStatusTag status={dialog.status} />,
    },
  ];
}
