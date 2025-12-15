import { type TableColumn, StatusTag, TableTimestampCell, DeviceCardCompact } from '@flamingo/ui-kit/components/ui'
import { Dialog, ClientDialogOwner } from '../types/dialog.types'

interface DialogTableColumnsOptions {
  organizationLookup?: Record<string, string>
}

export function getDialogTableColumns(options: DialogTableColumnsOptions = {}): TableColumn<Dialog>[] {
  const { organizationLookup = {} } = options
  return [
    {
      key: 'title',
      label: 'TITLE',
      width: 'flex-1 min-w-0',
      renderCell: (dialog) => (
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-ods-text-primary truncate block">
          {dialog.title}
        </span>
      )
    },
    {
      key: 'source',
      label: 'SOURCE',
      width: 'w-1/5',
      renderCell: (dialog) => {
        const isClientOwner = 'machine' in (dialog.owner || {})
        const clientOwner = isClientOwner ? (dialog.owner as ClientDialogOwner) : null
        const deviceName = clientOwner?.machine?.displayName || clientOwner?.machine?.hostname
        const organizationId = clientOwner?.machine?.organizationId
        const organizationName = organizationId ? organizationLookup[organizationId] : undefined

        return (
          <DeviceCardCompact
            deviceName={deviceName || 'Unknown Device'}
            organization={organizationName}
          />
        )
      }
    },
    {
      key: 'createdAt',
      label: 'CREATED',
      width: 'w-1/5',
      renderCell: (dialog) => (
        <TableTimestampCell
          timestamp={dialog.createdAt}
          id={dialog.id}
        />
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      width: 'w-1/6',
      filterable: true,
      renderCell: (dialog) => {
        const getStatusVariant = (status: string) => {
          switch (status) {
            case 'ACTIVE':
              return 'success' as const
            case 'ACTION_REQUIRED':
              return 'warning' as const
            case 'ON_HOLD':
              return 'error' as const
            case 'RESOLVED':
              return 'success' as const
            case 'ARCHIVED':
              return 'info' as const
            default:
              return 'info' as const
          }
        }

        if (dialog.status === 'RESOLVED') {
          return (
            <div className="shrink-0">
              <StatusTag
                label="RESOLVED"
              />
            </div>
          )
        }

        return (
          <div className="shrink-0">
            <StatusTag
              label={dialog.status.replace('_', ' ')}
              variant={getStatusVariant(dialog.status)}
            />
          </div>
        )
      }
    },
  ]
}