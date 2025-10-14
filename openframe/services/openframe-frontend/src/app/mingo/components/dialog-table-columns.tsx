import React from 'react'
import { type TableColumn, type RowAction, StatusTag } from '@flamingo/ui-kit/components/ui'
import { Dialog } from '../types/dialog.types'

export function getDialogTableRowActions(
  onDetails: (dialog: Dialog) => void
): RowAction<Dialog>[] {
  return [
    {
      label: 'Details',
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