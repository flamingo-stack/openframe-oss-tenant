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
import { EditProfileIcon, RefreshIcon } from '@flamingo/ui-kit/components/icons'
import { EditSsoConfigModal } from '../edit-sso-config-modal'
import { SsoConfigDetailsModal } from '../sso-config-details-modal'
import { useSsoConfig, type ProviderConfig, type AvailableProvider } from '../../hooks/use-sso-config'

type UIProviderRow = {
  id: string
  provider: string
  displayName: string
  status: { label: string; variant: 'success' | 'info' }
  hasConfig: boolean
  original?: { available: AvailableProvider; config?: ProviderConfig }
}

export function SsoConfigurationTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [providers, setProviders] = useState<UIProviderRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ open: boolean; providerKey: string; displayName: string; clientId?: string | null; clientSecret?: string | null; msTenantId?: string | null } | null>(null)
  const [details, setDetails] = useState<{ open: boolean; providerKey: string; displayName: string; status: { label: string; variant: 'success' | 'info' }; clientId?: string | null; clientSecret?: string | null; msTenantId?: string | null } | null>(null)

  const { fetchAvailableProviders, fetchProviderConfig, updateProviderConfig, toggleProviderEnabled } = useSsoConfig()

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // 1) Fetch available providers
      const available = await fetchAvailableProviders()

      // 2) For each provider fetch its config in parallel
      const configs = await Promise.all(available.map(p => fetchProviderConfig(p.provider)))

      const rows: UIProviderRow[] = available.map((p, idx) => {
        const cfg = configs[idx]
        const isEnabled = cfg?.enabled === true
        return {
          id: p.provider,
          provider: p.provider,
          displayName: p.displayName,
          status: {
            label: isEnabled ? 'ACTIVE' : 'INACTIVE',
            variant: isEnabled ? 'success' : 'info'
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
      width: 'w-1/3',
      renderCell: (row) => (
        <div className="flex flex-col justify-center w-80 shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary truncate">{row.displayName}</span>
          <span className="font-['Azeret_Mono'] font-normal text-[12px] leading-[16px] text-ods-text-secondary truncate uppercase">{row.provider}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      width: 'w-1/3',
      renderCell: (row) => (
        <div className="w-32 shrink-0">
          <StatusTag label={row.status.label} variant={row.status.variant} />
        </div>
      )
    },
    {
      key: 'hasConfig',
      label: 'CONFIGURATION',
      width: 'w-1/3',
      renderCell: (row) => (
        <div className="w-36 shrink-0">
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
      icon: <EditProfileIcon className="h-6 w-6 text-ods-text-primary" />,
      onClick: (row) => {
        setEditing({
          open: true,
          providerKey: row.provider,
          displayName: row.displayName,
          clientId: row.original?.config?.clientId,
          clientSecret: row.original?.config?.clientSecret,
          msTenantId: row.original?.config?.msTenantId
        })
      },
      variant: 'outline',
      className: 'bg-ods-card border-ods-border hover:bg-ods-bg-hover h-12 w-12'
    },
    {
      label: 'Details',
      onClick: (row) => {
        setDetails({
          open: true,
          providerKey: row.provider,
          displayName: row.displayName,
          status: row.status,
          clientId: row.original?.config?.clientId,
          clientSecret: row.original?.config?.clientSecret,
          msTenantId: row.original?.config?.msTenantId
        })
      },
      variant: 'outline',
      className: "bg-ods-card border-ods-border hover:bg-ods-bg-hover text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] px-4 py-3 h-12"
    }
  ], [])

  if (error) {
    return <PageError message={error} />
  }

  return (
    <ListPageContainer
      title="SSO Configurations"
      background="default"
      padding='none'
      className='pt-6'
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
        actionsWidth={140}
        showFilters={false}
        rowClassName="mb-1"
      />
      <EditSsoConfigModal
        isOpen={Boolean(editing?.open)}
        onClose={() => setEditing(null)}
        providerKey={editing?.providerKey || ''}
        providerDisplayName={editing?.displayName || ''}
        initialClientId={editing?.clientId}
        initialClientSecret={editing?.clientSecret}
        initialMsTenantId={editing?.msTenantId}
        onSubmit={async ({ clientId, clientSecret, msTenantId }) => {
          if (!editing?.providerKey) return
          await updateProviderConfig(editing.providerKey, { clientId, clientSecret, msTenantId })
          await loadData()
        }}
      />
      <SsoConfigDetailsModal
        isOpen={Boolean(details?.open)}
        onClose={() => setDetails(null)}
        providerKey={details?.providerKey || ''}
        providerDisplayName={details?.displayName || ''}
        status={details?.status || { label: 'INACTIVE', variant: 'info' }}
        clientId={details?.clientId}
        clientSecret={details?.clientSecret}
        msTenantId={details?.msTenantId}
        onToggle={async (enabled) => {
          if (!details?.providerKey) return
          await toggleProviderEnabled(details.providerKey, enabled)
          setDetails(null)
          await loadData()
        }}
      />
    </ListPageContainer>
  )
}


