'use client'

import { useApiParams } from "@flamingo-stack/openframe-frontend-core/hooks"
import { TicketsTabNavigation } from './tabs'
import { TicketsTabContent } from './tabs/tickets-tab-content'

export function TicketsView() {
  const { params, setParam } = useApiParams({
    tab: { type: 'string', default: 'current' },
    status: { type: 'array', default: [] }
  })

  return (
    <div className="flex flex-col w-full">
      <TicketsTabNavigation 
        activeTab={params.tab} 
        onTabChange={(tab) => setParam('tab', tab)} 
      />
      <TicketsTabContent 
        activeTab={params.tab}
        statusFilters={params.status}
        onStatusFilterChange={(status) => setParam('status', status)}
      />
    </div>
  )
}