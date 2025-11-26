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
import { SsoConfigModal } from '../edit-sso-config-modal'
import { useSsoConfig, type ProviderConfig, type AvailableProvider } from '../../hooks/use-sso-config'
import { getProviderIcon } from '../../utils/get-provider-icon'
import { featureFlags } from '@/src/lib/feature-flags'

// Feature flag: enabled by default, can disable with env var
const isDomainAllowlistEnabled = featureFlags.ssoAutoAllow.enabled();

type UIProviderRow = {
  id: string
  provider: string
  displayName: string
  status: { label: string; variant: 'success' | 'info' }
  hasConfig: boolean
  allowedDomains: string[]
  autoProvisionUsers: boolean
  original?: { available: AvailableProvider; config?: ProviderConfig }
}

export function SsoConfigurationTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [providers, setProviders] = useState<UIProviderRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalState, setModalState] = useState<{
    open: boolean
    providerKey: string
    displayName: string
    isEnabled: boolean
    clientId?: string | null
    clientSecret?: string | null
    msTenantId?: string | null
    autoProvisionUsers?: boolean
    allowedDomains?: string[]
  } | null>(null)

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
          allowedDomains: cfg?.allowedDomains || [],
          autoProvisionUsers: cfg?.autoProvisionUsers || false,
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

  const columns: TableColumn<UIProviderRow>[] = useMemo(() => {
    const baseColumns: TableColumn<UIProviderRow>[] = [
      {
        key: 'provider',
        label: 'OAUTH PROVIDER',
        width: 'flex-[2] min-w-0',
        renderCell: (row) => (
          <div className="flex items-center gap-3">
            {getProviderIcon(row.provider)}
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary truncate">{row.displayName}</span>
              <span className="font-['Azeret_Mono'] font-normal text-[12px] leading-[16px] text-ods-text-secondary truncate uppercase">{row.provider}</span>
            </div>
          </div>
        )
      },
      {
        key: 'status',
        label: 'STATUS',
        width: 'flex-1 min-w-0',
        renderCell: (row) => (
          <div className="w-fit">
            <StatusTag label={row.status.label} variant={row.status.variant} />
          </div>
        )
      }
    ]

    // Only add allowed domains column if feature is enabled
    if (isDomainAllowlistEnabled) {
      baseColumns.push({
        key: 'allowedDomains',
        label: 'ALLOWED DOMAINS',
        width: 'flex-[1.5] min-w-0',
        renderCell: (row) => (
          <span className="font-['DM_Sans'] text-[14px] leading-[18px] text-ods-text-secondary truncate block">
            {row.allowedDomains.length > 0 ? row.allowedDomains.join(', ') : 'None'}
          </span>
        )
      })
    }

    baseColumns.push({
      key: 'hasConfig',
      label: 'CONFIGURATION',
      width: 'flex-1 min-w-0',
      renderCell: (row) => (
        <span className="font-['DM_Sans'] text-[14px] leading-[18px] text-ods-text-secondary">{row.hasConfig ? 'Configured' : 'Not configured'}</span>
      )
    })

    return baseColumns
  }, [])

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
      label: 'Edit',
      icon: <EditProfileIcon className="h-6 w-6 text-ods-text-primary" />,
      onClick: (row) => {
        setModalState({
          open: true,
          providerKey: row.provider,
          displayName: row.displayName,
          isEnabled: row.status.label === 'ACTIVE',
          clientId: row.original?.config?.clientId,
          clientSecret: row.original?.config?.clientSecret,
          msTenantId: row.original?.config?.msTenantId,
          autoProvisionUsers: row.autoProvisionUsers,
          allowedDomains: row.allowedDomains
        })
      },
      variant: 'outline',
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
        showFilters={false}
        rowClassName="mb-1"
      />
      <SsoConfigModal
        isOpen={Boolean(modalState?.open)}
        onClose={() => setModalState(null)}
        providerKey={modalState?.providerKey || ''}
        providerDisplayName={modalState?.displayName || ''}
        isEnabled={modalState?.isEnabled}
        initialClientId={modalState?.clientId}
        initialClientSecret={modalState?.clientSecret}
        initialMsTenantId={modalState?.msTenantId}
        initialAutoProvisionUsers={modalState?.autoProvisionUsers}
        initialAllowedDomains={modalState?.allowedDomains}
        onSubmit={async ({ clientId, clientSecret, msTenantId, autoProvisionUsers, allowedDomains }) => {
          if (!modalState?.providerKey) return
          await updateProviderConfig(modalState.providerKey, { clientId, clientSecret, msTenantId, autoProvisionUsers, allowedDomains })
          // Also enable the provider after saving
          await toggleProviderEnabled(modalState.providerKey, true)
          await loadData()
        }}
        onDisable={async () => {
          if (!modalState?.providerKey) return
          await toggleProviderEnabled(modalState.providerKey, false)
          setModalState(null)
          await loadData()
        }}
      />
    </ListPageContainer>
  )
}


