import {
  DeviceCardCompact,
  type TableColumn,
  TableTimestampCell,
  Tag,
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
      width: 'w-[70%] sm:flex-1 min-w-0',
      renderCell: dialog => (
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-ods-text-primary truncate block">
          {dialog.title}
        </span>
      ),
    },
    {
      key: 'source',
      label: 'SOURCE',
      hideAt: 'sm',
      renderCell: dialog => {
        const isClientOwner = 'machine' in (dialog.owner || {});
        const clientOwner = isClientOwner ? (dialog.owner as ClientDialogOwner) : null;
        const deviceName = clientOwner?.machine?.displayName || clientOwner?.machine?.hostname;
        const organizationId = clientOwner?.machine?.organizationId;
        const organizationName = organizationId ? organizationLookup[organizationId] : undefined;

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
      renderCell: dialog => {
        const getStatusVariant = (status: string) => {
          switch (status) {
            case 'ACTIVE':
              return 'success' as const;
            case 'ACTION_REQUIRED':
              return 'warning' as const;
            case 'ON_HOLD':
              return 'error' as const;
            case 'RESOLVED':
              return 'success' as const;
            case 'ARCHIVED':
              return 'outline' as const;
            default:
              return 'outline' as const;
          }
        };

        if (dialog.status === 'RESOLVED') {
          return (
            <div className="shrink-0">
              <Tag label="RESOLVED" />
            </div>
          );
        }

        return (
          <div className="shrink-0">
            <Tag label={dialog.status.replace('_', ' ')} variant={getStatusVariant(dialog.status)} />
          </div>
        );
      },
    },
  ];
}
