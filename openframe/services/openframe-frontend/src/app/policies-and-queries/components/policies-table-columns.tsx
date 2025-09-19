import React from 'react'
import { type TableColumn, type RowAction } from "@flamingo/ui-kit/components/ui"
import { MoreHorizontal } from "lucide-react"
import { Policy } from '../types/policies.types'

export function getPolicyTableRowActions(
  onMore: (dialog: Policy) => void,
  onDetails: (dialog: Policy) => void
): RowAction<Policy>[] {
  return [
    {
      label: '',
      icon: <MoreHorizontal className="h-6 w-6 text-[#fafafa]" />,
      onClick: onMore,
      variant: 'outline',
      className: 'bg-[#212121] border-[#3a3a3a] hover:bg-[#2a2a2a] h-12 w-12'
    },
    {
      label: 'Details',
      onClick: onDetails,
      variant: 'outline',
      className: "bg-[#212121] border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] font-['DM_Sans'] font-bold text-[18px] px-4 py-3 h-12"
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
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-[#fafafa] truncate">
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
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-[#888888] truncate">
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
          <span className="font-['Azeret_Mono'] font-normal text-[18px] leading-[18px] text-[#888888] truncate">
            {policy.enabled}
          </span>
        </div>
      )
    },
  ]
}