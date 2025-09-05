'use client'

import { FilterIcon } from "@flamingo/ui-kit/components/icons"
import { FiltersDropdown, type FilterSection } from "@flamingo/ui-kit/components/features"
import { cn } from "@flamingo/ui-kit/utils"

export interface TableColumn {
  key: string
  label: string
  width?: string
  filterable?: boolean
  hideOnMobile?: boolean
}

interface FilterConfig {
  sections: FilterSection[]
  appliedFilters: Record<string, string[]>
  onApply: (filters: Record<string, string[]>) => void
  onReset: () => void
}

interface TableHeaderProps {
  columns: TableColumn[]
  filterConfigs?: Record<string, FilterConfig>
  onColumnSort?: (columnKey: string, direction: 'asc' | 'desc') => void
}

export function TableHeader({ 
  columns, 
  filterConfigs = {},
  onColumnSort
}: TableHeaderProps) {
  return (
    <div className="hidden md:flex items-center gap-4 px-4 py-3 bg-[#161616]">
      {columns.map((column) => (
        <div 
          key={column.key}
          className={cn(
            "flex gap-2 items-center justify-start shrink-0",
            column.width
          )}
        >
          <span className="font-['Azeret_Mono'] font-medium text-[12px] leading-[16px] text-[#888888] uppercase tracking-[-0.24px]">
            {column.label}
          </span>
          
          {column.filterable && filterConfigs[column.key] && (
            <FiltersDropdown
              triggerElement={
                <button
                  className={cn(
                    "p-0.5 rounded transition-all duration-200",
                    filterConfigs[column.key].appliedFilters && 
                    Object.values(filterConfigs[column.key].appliedFilters).flat().length > 0
                      ? "bg-[#FFD951] hover:bg-[#FFD951]/80"
                      : "hover:bg-[#2a2a2a]"
                  )}
                  aria-label={`Filter by ${column.label}`}
                >
                  <FilterIcon 
                    className={cn(
                      "w-4 h-4 transition-colors",
                      filterConfigs[column.key].appliedFilters && 
                      Object.values(filterConfigs[column.key].appliedFilters).flat().length > 0
                        ? "text-[#161616]"
                        : "text-[#888888] hover:text-[#fafafa]"
                    )}
                  />
                </button>
              }
              sections={filterConfigs[column.key].sections}
              onApply={filterConfigs[column.key].onApply}
              onReset={filterConfigs[column.key].onReset}
              currentFilters={filterConfigs[column.key].appliedFilters}
              placement="bottom-start"
              dropdownClassName="min-w-[240px]"
            />
          )}
        </div>
      ))}
      
      {/* Space for actions - matches LogTableRow actions container */}
      <div className="flex gap-2 items-center shrink-0 ml-auto" />
    </div>
  )
}