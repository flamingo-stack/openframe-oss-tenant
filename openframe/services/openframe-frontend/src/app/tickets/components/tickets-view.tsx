'use client'

import { useSearchParams } from 'next/navigation'
import { TicketsTabNavigation } from './tabs'
import { TicketsTabContent } from './tabs/tickets-tab-content'

export function TicketsView() {
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('tab') || 'current'

  return (
    <div className="flex flex-col w-full">
      <TicketsTabNavigation />
      <TicketsTabContent activeTab={activeTab} />
    </div>
  )
}