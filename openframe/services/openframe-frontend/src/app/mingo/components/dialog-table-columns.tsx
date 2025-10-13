import React from 'react'
import { type TableColumn, type RowAction, StatusTag } from '@flamingo/ui-kit/components/ui'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { Dialog } from '../types/dialog.types'

export function getDialogTableRowActions(
  onMore: (dialog: Dialog) => void,
  onDetails: (dialog: Dialog) => void
): RowAction<Dialog>[] {
  return [
    {
      label: '',
      icon: <MoreHorizontal className="h-6 w-6 text-ods-text-primary" />,
      onClick: onMore,
      variant: 'outline',
      className: 'bg-ods-card border-ods-border hover:bg-ods-bg-hover h-12 w-12'
    },
    {
      label: '',
      icon: <ChevronRight className="h-6 w-6 text-ods-text-primary" />,
      onClick: onDetails,
      variant: 'outline',
      className: "bg-ods-card border-ods-border hover:bg-ods-bg-hover text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] px-4 py-3 h-12"
    }
  ]
}

export function getDialogTableColumns(): TableColumn<Dialog>[] {
  return [
    {
      key: 'title',
      label: 'TITLE',
      width: 'w-1/3',
      renderCell: (dialog) => (
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-ods-text-primary truncate">
          {dialog.title}
        </span>
      )
    },
    {
      key: 'owner',
      label: 'OWNER',
      width: 'w-1/6',
      renderCell: (dialog) => (
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-ods-text-secondary truncate">
          {'machineId' in (dialog.owner || {}) ? (dialog.owner as any).machineId : dialog.owner?.type}
        </span>
      )
    },
    {
      key: 'createdAt',
      label: 'CREATED',
      width: 'w-1/6',
      renderCell: (dialog) => (
        <span className="font-['Azeret_Mono'] font-normal text-[18px] leading-[18px] text-ods-text-secondary truncate">
          {dialog.createdAt}
        </span>
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
            case 'ACTION_REQUIRED':
              return 'warning' as const
            case 'ON_HOLD':
              return 'error' as const
            case 'ACTIVE':
              return 'warning' as const
            case 'RESOLVED':
              return 'success' as const
            case 'ARCHIVED':
              return 'info' as const
            default:
              return 'info' as const
          }
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