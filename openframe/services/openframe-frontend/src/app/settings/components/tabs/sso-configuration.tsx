'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Table,
  SearchBar,
  Button,
  ListPageContainer,
  PageError,
  StatusTag,
  type TableColumn,
  type RowAction
} from '@flamingo/ui-kit/components/ui'
import { RefreshIcon } from '@flamingo/ui-kit/components/icons'
import { MoreHorizontal } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

type AvailableProvider = {
  provider: string
  displayName: string
}

type ProviderConfig = {
  id: string | null
  provider: string
  clientId: string | null
  clientSecret: string | null
  enabled: boolean
}

type UIProviderRow = {
  id: string
  provider: string
  displayName: string
  status: { label: string; variant: 'success' | 'warning' | 'error' | 'info' }
  hasConfig: boolean
  original?: { available: AvailableProvider; config?: ProviderConfig }
}

export function SsoConfigurationTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [providers, setProviders] = useState<UIProviderRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // 1) Fetch available providers
      const availableRes = await apiClient.get<AvailableProvider[]>('sso/providers/available')
      if (!availableRes.ok || !Array.isArray(availableRes.data)) {
        throw new Error(availableRes.error || `Failed to load providers (${availableRes.status})`)
      }

      const available = availableRes.data

      // 2) For each provider fetch its config in parallel
      const configs = await Promise.all(
        available.map(async (p) => {
          const res = await apiClient.get<ProviderConfig>(`sso/${encodeURIComponent(p.provider)}`)
          return res.ok ? res.data : undefined
        })
      )

      const rows: UIProviderRow[] = available.map((p, idx) => {
        const cfg = configs[idx]
        const isEnabled = cfg?.enabled === true
        return {
          id: p.provider,
          provider: p.provider,
          displayName: p.displayName,
          status: {
            label: isEnabled ? 'ACTIVE' : 'INACTIVE',
            variant: isEnabled ? 'success' : 'warning'
          },
          hasConfig: Boolean(cfg?.clientId || cfg?.clientSecret),
          original: { available: p, config: cfg }
        }
      })

      setProviders(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SSO providers')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const columns: TableColumn<UIProviderRow>[] = useMemo(() => [
    {
      key: 'provider',
      label: 'OAUTH PROVIDER',
      width: 'w-96',
      renderCell: (row) => (
        <div className="flex flex-col justify-center w-96 shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary truncate">{row.displayName}</span>
          <span className="font-['Azeret_Mono'] font-normal text-[12px] leading-[16px] text-ods-text-secondary truncate uppercase">{row.provider}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      width: 'w-40',
      renderCell: (row) => (
        <div className="w-40 shrink-0">
          <StatusTag label={row.status.label} variant={row.status.variant} />
        </div>
      )
    },
    {
      key: 'hasConfig',
      label: 'CONFIGURATION',
      width: 'w-40',
      renderCell: (row) => (
        <div className="w-40 shrink-0">
          <span className="font-['DM_Sans'] text-[14px] leading-[18px] text-ods-text-secondary">{row.hasConfig ? 'Configured' : 'Not configured'}</span>
        </div>
      )
    },
  ], [])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return providers
    return providers.filter(p =>
      p.displayName.toLowerCase().includes(term) ||
      p.provider.toLowerCase().includes(term)
    )
  }, [providers, searchTerm])

  const rowActions: RowAction<UIProviderRow>[] = useMemo(() => [
    {
      label: '',
      icon: <MoreHorizontal className="h-6 w-6 text-ods-text-primary" />,
      onClick: (row) => {
        console.log('More clicked for provider:', row.provider)
      },
      variant: 'outline',
      className: 'bg-ods-card border-ods-border hover:bg-ods-bg-hover h-12 w-12'
    },
    {
      label: 'Details',
      onClick: (row) => {
        // Placeholder: could navigate to detailed config/editor when available
        console.log('Details for provider:', row.provider)
      },
      variant: 'outline',
      className: "bg-ods-card border-ods-border hover:bg-ods-bg-hover text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] px-4 py-3 h-12"
    }
  ], [])

  const headerActions = (
    <Button
      onClick={loadData}
      leftIcon={<RefreshIcon size={20} />}
      className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
    >
      Refresh
    </Button>
  )

  if (error) {
    return <PageError message={error} />
  }

  return (
    <ListPageContainer
      title="SSO Configurations"
      headerActions={headerActions}
      background="default"
      padding="sm"
    >
      <SearchBar
        placeholder="Search for API Key"
        onSubmit={setSearchTerm}
        value={searchTerm}
        className="w-full"
      />

      <Table
        data={filtered}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        emptyMessage="No SSO providers found."
        rowActions={rowActions}
        showFilters={false}
        rowClassName="mb-1"
      />
    </ListPageContainer>
  )
}


