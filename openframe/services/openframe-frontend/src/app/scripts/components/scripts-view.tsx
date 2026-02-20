'use client'

import {
  TabNavigation,
  getTabComponent,
  type TabItem,
} from '@flamingo-stack/openframe-frontend-core'
import { BracketCurlyIcon, CalendarIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2'
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks'
import { useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { ScriptsTable } from './scripts-table'
import { ScriptSchedulesTable } from './script-schedules-table'

const SCRIPTS_TABS: TabItem[] = [
  {
    id: 'list',
    label: 'Scripts List',
    icon: BracketCurlyIcon,
    component: ScriptsTable,
  },
  {
    id: 'schedules',
    label: 'Scripts Schedules',
    icon: CalendarIcon,
    component: ScriptSchedulesTable,
  },
]

export function ScriptsView() {
  const router = useRouter()
  const pathname = usePathname()

  const { params, setParam } = useApiParams({
    tab: { type: 'string', default: 'list' },
  })

  const handleTabChange = useCallback(
    (tabId: string) => {
      router.replace(`${pathname}?tab=${tabId}`)
    },
    [router, pathname],
  )

  const TabComponent = getTabComponent(SCRIPTS_TABS, params.tab)

  return (
    <div className="flex flex-col w-full">
      <TabNavigation
        tabs={SCRIPTS_TABS}
        activeTab={params.tab}
        urlSync={false}
        onTabChange={handleTabChange}
      />
      <div className="min-h-[400px]">
        {TabComponent ? <TabComponent /> : null}
      </div>
    </div>
  )
}
