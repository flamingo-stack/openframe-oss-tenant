'use client'

import { featureFlags } from '@/src/lib/feature-flags'
import { EditProfileIcon, GoogleLogo, MicrosoftIcon } from '@flamingo-stack/openframe-frontend-core/components/icons'
import {
  Card,
  CheckboxWithDescription,
  ListPageContainer,
  PageError,
  SearchBar,
  Skeleton,
  StatusTag,
  Table,
  type RowAction,
  type TableColumn
} from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSsoConfig, type AvailableProvider, type ProviderConfig } from '../../hooks/use-sso-config'
import { useTenantDomain, type TenantDomainInfo } from '../../hooks/use-tenant-domain'
import { getProviderIcon } from '../../utils/get-provider-icon'
import { SsoConfigModal } from '../edit-sso-config-modal'

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

  // Shared SSO provider state
  const [tenantDomain, setTenantDomain] = useState<TenantDomainInfo | null>(null)
  const [isDomainLoading, setIsDomainLoading] = useState(true)
  const [isAutoProvisionUpdating, setIsAutoProvisionUpdating] = useState(false)

  const { fetchAvailableProviders, fetchProviderConfig, updateProviderConfig, toggleProviderEnabled } = useSsoConfig()
  const { fetchTenantDomain, updateSharedAutoProvision } = useTenantDomain()
  const { toast } = useToast()

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

  // Load tenant domain info for shared SSO provider
  const loadDomainData = useCallback(async () => {
    setIsDomainLoading(true)
    try {
      const domainInfo = await fetchTenantDomain()
      setTenantDomain(domainInfo)
    } catch (err) {
      console.error('Failed to load tenant domain:', err)
      // Don't set error state - shared SSO section will just not show
      setTenantDomain(null)
    } finally {
      setIsDomainLoading(false)
    }
  }, [fetchTenantDomain])

  // Handle shared auto provision toggle
  const handleAutoProvisionToggle = useCallback(async (enabled: boolean) => {
    if (!tenantDomain || tenantDomain.generic) return

    setIsAutoProvisionUpdating(true)
    try {
      const result = await updateSharedAutoProvision(enabled)

      if (result.error) {
        toast({
          title: 'Auto Provision Failed',
          description: result.error.message,
          variant: 'destructive',
          duration: 5000
        })
        return
      }

      // Update local state
      setTenantDomain(prev => prev ? { ...prev, autoAllow: enabled } : null)

      toast({
        title: enabled ? 'Auto Provision Enabled' : 'Auto Provision Disabled',
        description: enabled
          ? `Users from ${tenantDomain.domain} can now sign in via shared Google and Microsoft SSO.`
          : 'Auto provision for shared SSO providers has been disabled.',
        variant: 'success',
        duration: 4000
      })
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: err instanceof Error ? err.message : 'Failed to update auto provision setting',
        variant: 'destructive',
        duration: 5000
      })
    } finally {
      setIsAutoProvisionUpdating(false)
    }
  }, [tenantDomain, updateSharedAutoProvision, toast])

  useEffect(() => {
    loadData()
    loadDomainData()
  }, [loadData, loadDomainData])

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
        placeholder="Search SSO providers"
        onSubmit={setSearchTerm}
        value={searchTerm}
        className="w-full"
      />

      {/* Shared SSO Provider Section */}
      {isDomainLoading ? (
        <Card className="bg-ods-card border-ods-border my-6 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-6 w-6 rounded shrink-0" />
              <Skeleton className="h-4 w-3 shrink-0" />
              <Skeleton className="h-6 w-6 rounded shrink-0" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-5 w-48 md:w-64" />
                <Skeleton className="h-4 w-full md:w-96" />
              </div>
            </div>
            <Skeleton className="h-20 w-full md:w-[400px] rounded-lg" />
          </div>
        </Card>
      ) : tenantDomain && (
        <Card className="bg-ods-card border-ods-border my-6 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Row 1 on mobile / Left side on desktop: Icons and text */}
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2 shrink-0">
                <GoogleLogo className="h-6 w-6" />
                <span className="text-ods-text-secondary">&</span>
                <MicrosoftIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ods-text-primary">OpenFrame Google & Microsoft SSO</h2>
                <p className="text-sm text-ods-text-secondary">
                  Allow any account from {tenantDomain.domain} domain to access OpenFrame via shared SSO providers. Accounts will be auto provisioned upon first sign-in.
                </p>
              </div>
            </div>

            {/* Row 2 on mobile / Right side on desktop: Checkbox */}
            <CheckboxWithDescription
              id="shared-auto-provision"
              checked={tenantDomain.autoAllow}
              onCheckedChange={handleAutoProvisionToggle}
              disabled={tenantDomain.generic || isAutoProvisionUpdating}
              title={`Auto-provision accounts from ${tenantDomain.domain}`}
              description={
                tenantDomain.generic
                  ? `Generic domains like ${tenantDomain.domain} cannot be used for auto-provisioning.`
                  : "Automatically create user accounts when signing in via shared Google or Microsoft SSO."
              }
              className="w-full md:w-[400px] md:shrink-0"
            />
          </div>
        </Card>
      )}

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


