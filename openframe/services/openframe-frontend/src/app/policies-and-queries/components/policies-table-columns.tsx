import React from 'react'
import { type TableColumn, type RowAction } from "@flamingo-stack/openframe-frontend-core/components/ui"
import { MoreHorizontal } from "lucide-react"
import { Policy } from '../types/policies.types'

export function getPolicyTableRowActions(
  onMore: (dialog: Policy) => void,
  onDetails: (dialog: Policy) => void
): RowAction<Policy>[] {
  return [
    {
      label: '',
      icon: <MoreHorizontal className="h-6 w-6 text-ods-text-primary" />,
      onClick: onMore,
      variant: 'outline',
      className: 'bg-ods-card border-ods-border hover:bg-ods-bg-hover h-12 w-12'
    },
    {
      label: 'Details',
      onClick: onDetails,
      variant: 'outline',
      className: "bg-ods-card border-ods-border hover:bg-ods-bg-hover text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] px-4 py-3 h-12"
    }
  ]
}

export function getPolicyTableColumns(): TableColumn<Policy>[] {
  return [
    {
      key: 'name',
      label: 'NAME',
      width: 'w-80',
      renderCell: (policy) => (
        <div className="flex flex-col justify-center w-80 shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-ods-text-primary truncate">
            {policy.name}
          </span>
        </div>
      )
    },
    {
      key: 'severity',
      label: 'STATUS',
      width: 'w-40',
      filterable: true,
      renderCell: (policy) => {
        return (
          <div className="flex flex-col items-start gap-1 w-40 shrink-0">
            <span className="px-2 py-1 rounded-md text-[14px] font-medium border">
              {policy.critical}
            </span>
          </div>
        )
      }
    },
    {
      key: 'category',
      label: 'CATEGORY',
      width: 'w-40',
      renderCell: (policy) => (
        <div className="flex flex-col justify-center w-40 shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-ods-text-secondary truncate">
            {policy.category}
          </span>
        </div>
      )
    },
    {
      key: 'enabled',
      label: 'ENABLED',
      width: 'w-32',
      renderCell: (policy) => (
        <div className="flex flex-col justify-center w-32 shrink-0">
          <span className="font-['Azeret_Mono'] font-normal text-[18px] leading-[18px] text-ods-text-secondary truncate">
            {policy.enabled}
          </span>
        </div>
      )
    },
  ]
}