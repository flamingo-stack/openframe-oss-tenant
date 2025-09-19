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
      icon: <MoreHorizontal className="h-6 w-6 text-[#fafafa]" />,
      onClick: onMore,
      variant: 'outline',
      className: 'bg-[#212121] border-[#3a3a3a] hover:bg-[#2a2a2a] h-12 w-12'
    },
    {
      label: '',
      icon: <ChevronRight className="h-6 w-6 text-[#fafafa]" />,
      onClick: onDetails,
      variant: 'outline',
      className: "bg-[#212121] border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] font-['DM_Sans'] font-bold text-[18px] px-4 py-3 h-12"
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
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-[#fafafa] truncate">
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
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-[#888888] truncate">
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
          <span className="font-['Azeret_Mono'] font-normal text-[18px] leading-[18px] text-[#888888] truncate">
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
          'TECH_REQUIRED': "bg-[#FFC008] border-[#FFC008] font-['Azeret_Mono'] font-normal text-[#212121]",
          'ON_HOLD': "bg-[#4A2121] border-[#4A2121] text-[#F36666] font-['Azeret_Mono'] font-normal text-[#212121]",
          'ACTIVE': "bg-[#2E461F] border-[#2E461F] text-[#5EA62E] font-['Azeret_Mono'] font-normal text-[#212121]",
          'RESOLVED': 'bg-green-900/20 text-green-400 border-green-600/30'
        }
        return (
          <div className="flex flex-col items-start gap-1 w-40 shrink-0">
            <span className={`px-2 py-1 rounded-md text-[14px] font-medium border ${
              statusColors[dialog.status as keyof typeof statusColors] || 'bg-gray-900/20 text-gray-400 border-gray-600/30'
            }`}>
              {dialog.status.replace('_', ' ')}
            </span>
          </div>
        )
      }
    },
  ]
}