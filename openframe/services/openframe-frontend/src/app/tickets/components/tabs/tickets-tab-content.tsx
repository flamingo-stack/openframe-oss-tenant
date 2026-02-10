'use client'

import { getTabComponent } from '@flamingo-stack/openframe-frontend-core'
import { TICKETS_TABS } from './tickets-tabs'

interface TicketsTabContentProps {
  activeTab: string
  statusFilters?: string[]
  onStatusFilterChange?: (status: string[]) => void
}

export function TicketsTabContent({ 
  activeTab, 
  statusFilters, 
  onStatusFilterChange 
}: TicketsTabContentProps) {
  const TabComponent = getTabComponent(TICKETS_TABS, activeTab)

  if (!TabComponent) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-ods-text-primary mb-2">Tab Not Found</h3>
          <p className="text-ods-text-secondary">The selected tab &quot;{activeTab}&quot; could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[400px]">
      <TabComponent 
        statusFilters={statusFilters}
        onStatusFilterChange={onStatusFilterChange}
      />
    </div>
  )
}