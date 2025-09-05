'use client'

import React from "react"
import { Search } from "lucide-react"

interface EmptyStateConfig {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
}

interface EmptyStateProps {
  emptyState?: EmptyStateConfig
  searchTerm: string
  onClearSearch: () => void
}

export function EmptyState({ 
  emptyState, 
  searchTerm, 
  onClearSearch 
}: EmptyStateProps) {
  const defaultTitle = searchTerm ? `No results found` : "No data available"
  const defaultDescription = searchTerm 
    ? `No results found for "${searchTerm}". Try adjusting your search.` 
    : "There are no items to display at this time."

  return (
    <div className="flex items-center justify-center py-12 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#212121] border border-[#3a3a3a] flex items-center justify-center">
          {emptyState?.icon || <Search className="w-6 h-6 text-[#888888]" />}
        </div>
        
        <div className="space-y-2">
          <h3 className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-[#fafafa]">
            {emptyState?.title || defaultTitle}
          </h3>
          <p className="font-['DM_Sans'] font-regular text-[14px] leading-[18px] text-[#888888] max-w-sm">
            {emptyState?.description || defaultDescription}
          </p>
        </div>
        
        {searchTerm && !emptyState?.action && (
          <button
            onClick={onClearSearch}
            className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#ffc008] hover:text-[#ffd43d] transition-colors"
          >
            Clear search
          </button>
        )}
        
        {emptyState?.action && emptyState.action}
      </div>
    </div>
  )
}