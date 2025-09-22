import React from 'react'
import { type TableColumn, type RowAction } from "@flamingo/ui-kit/components/ui"
import { ChevronRight, MoreHorizontal } from "lucide-react"
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
      key: 'topic',
      label: 'TOPIC',
      width: 'w-80',
      renderCell: (dialog) => (
        <div className="flex flex-col justify-center w-80 shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-ods-text-primary truncate">
            {dialog.topic}
          </span>
        </div>
      )
    },
    {
      key: 'source',
      label: 'SOURCE',
      width: 'w-40',
      renderCell: (dialog) => (
        <div className="flex flex-col justify-center w-40 shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-ods-text-secondary truncate">
            {dialog.source}
          </span>
        </div>
      )
    },
    {
      key: 'slaCountdown',
      label: 'SLA COUNTDOWN',
      width: 'w-32',
      renderCell: (dialog) => (
        <div className="flex flex-col justify-center w-32 shrink-0">
          <span className="font-['Azeret_Mono'] font-normal text-[18px] leading-[18px] text-ods-text-secondary truncate">
            {dialog.slaCountdown}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      width: 'w-40',
      filterable: true,
      renderCell: (dialog) => {
        const statusColors = {
          'TECH_REQUIRED': "bg-ods-accent border-accent-primary font-['Azeret_Mono'] font-normal text-text-on-accent",
          'ON_HOLD': "bg-error/20 border-error text-error font-['Azeret_Mono'] font-normal text-text-on-accent",
          'ACTIVE': "bg-success border-success text-success font-['Azeret_Mono'] font-normal text-text-on-accent",
          'RESOLVED': 'bg-success/20 text-success border-success/30'
        }
        return (
          <div className="flex flex-col items-start gap-1 w-40 shrink-0">
            <span className={`px-2 py-1 rounded-md text-[14px] font-medium border ${
              statusColors[dialog.status as keyof typeof statusColors] || 'bg-ods-bg-surface/20 text-ods-text-muted border-ods-border/30'
            }`}>
              {dialog.status.replace('_', ' ')}
            </span>
          </div>
        )
      }
    },
  ]
}