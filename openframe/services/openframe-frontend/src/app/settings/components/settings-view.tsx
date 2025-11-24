'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SettingsTabNavigation, getSettingsTabs } from './tabs'
import { SettingsTabContent } from './settings-tab-content'

type TabId = 'ai-settings' | 'architecture' | 'company-and-users' | 'api-keys' | 'sso-configuration' | 'profile'

const DEFAULT_TAB: TabId = 'ai-settings'
const TAB_PARAM = 'tab'

export function SettingsView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const validTabIds = useMemo(
    () => new Set(getSettingsTabs().map(t => t.id)),
    []
  )

  const initialTab = useMemo<TabId>(() => {
    const fromUrl = (searchParams?.get(TAB_PARAM) || '').toLowerCase()
    return (validTabIds.has(fromUrl) ? (fromUrl as TabId) : DEFAULT_TAB)
  }, [searchParams, validTabIds])

  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  // Keep state in sync when the URL changes (e.g., back/forward navigation)
  useEffect(() => {
    const fromUrl = (searchParams?.get(TAB_PARAM) || '').toLowerCase()
    const next = (validTabIds.has(fromUrl) ? (fromUrl as TabId) : DEFAULT_TAB)
    if (next !== activeTab) {
      setActiveTab(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleTabChange = (tabId: string) => {
    const next = (tabId as TabId)
    setActiveTab(next)

    const params = new URLSearchParams(searchParams?.toString())
    params.set(TAB_PARAM, next)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col w-full">
      <SettingsTabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      <SettingsTabContent activeTab={activeTab} />
    </div>
  )
}


