'use client'

import { FilterIcon } from "@flamingo/ui-kit/components/icons"
import { FiltersDropdown, type FilterSection } from "@flamingo/ui-kit/components/features"
import { cn } from "@flamingo/ui-kit/utils"
import { TableColumn } from "./table-header"

interface FilterConfig {
  sections: FilterSection[]
  appliedFilters: Record<string, string[]>
  onApply: (filters: Record<string, string[]>) => void
  onReset: () => void
}

interface MobileHeaderProps {
  columns: TableColumn[]
  filterConfigs?: Record<string, FilterConfig>
}

export function MobileHeader({ 
  columns, 
  filterConfigs = {}
}: MobileHeaderProps) {
  const filterableColumns = columns.filter(col => col.filterable && !col.hideOnMobile)
  
  if (filterableColumns.length === 0) {
    return null
  }

  return (
    <div className="flex md:hidden gap-3 items-start justify-start px-3 py-0 relative overflow-visible">
      {filterableColumns.map((column, index) => {
        return (
          <div key={column.key} className="flex gap-2 h-12 items-center justify-start shrink-0 relative">
            <span className="font-['Azeret_Mono'] font-medium text-[12px] leading-[16px] text-[#888888] uppercase tracking-[-0.24px]">
              {column.label}
            </span>
            {filterConfigs[column.key] && (
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
                responsive={true}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}