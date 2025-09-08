'use client'

import { cn } from "@flamingo/ui-kit/utils"
import { TableColumn } from "./table-header"

interface TableRowSkeletonProps {
  index: number
  columns: TableColumn[]
}

export function TableRowSkeleton({ index, columns }: TableRowSkeletonProps) {
  return (
    <div key={`skeleton-${index}`} className="bg-[#212121] border border-[#3a3a3a] rounded-[6px] h-20 animate-pulse">
      {/* Desktop skeleton */}
      <div className="hidden md:flex gap-4 items-center justify-start px-4 py-0 h-20">
        {columns.map((column) => (
          <div key={column.key} className={cn("shrink-0", column.width)}>
            <div className="h-4 bg-[#3a3a3a] rounded mb-2" />
            <div className="h-3 bg-[#3a3a3a] rounded w-3/4" />
          </div>
        ))}
      </div>
      
      {/* Mobile skeleton */}
      <div className="flex md:hidden gap-3 items-center justify-start px-3 py-0 h-20">
        <div className="w-24 shrink-0">
          <div className="h-4 bg-[#3a3a3a] rounded mb-2" />
          <div className="h-3 bg-[#3a3a3a] rounded w-3/4" />
        </div>
        <div className="shrink-0">
          <div className="h-6 bg-[#3a3a3a] rounded w-16" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-[#3a3a3a] rounded mb-2" />
          <div className="h-3 bg-[#3a3a3a] rounded" />
        </div>
        <div className="w-12 h-12 bg-[#3a3a3a] rounded shrink-0" />
      </div>
    </div>
  )
}