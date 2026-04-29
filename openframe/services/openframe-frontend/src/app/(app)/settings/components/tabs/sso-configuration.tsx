'use client';

import { EditProfileIcon, GoogleLogo, MicrosoftIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  Card,
  CheckboxWithDescription,
  type ColumnDef,
  DataTable,
  Input,
  ListPageContainer,
  PageError,
  type Row,
  Skeleton,
  Tag,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { type AvailableProvider, type ProviderConfig, useSsoConfig } from '../../hooks/use-sso-config';
import { type TenantDomainInfo, useTenantDomain } from '../../hooks/use-tenant-domain';
import { getProviderIcon } from '../../utils/get-provider-icon';
import { SsoConfigModal } from '../edit-sso-config-modal';

type UiProviderRow = {
  id: string;
  provider: string;
  displayName: string;
  status: { label: string; variant: 'success' | 'grey' };
  hasConfig: boolean;
  allowedDomains: string[];
  autoProvisionUsers: boolean;
  original?: { available: AvailableProvider; config?: ProviderConfig };
};

export function SsoConfigurationTab() {
  const isDomainAllowlistEnabled = featureFlags.ssoAutoAllow.enabled();
  const [searchTerm, setSearchTerm] = useState('');
  const [providers, setProviders] = useState<UiProviderRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    open: boolean;
    providerKey: string;
    displayName: string;
    isEnabled: boolean;
    clientId?: string | null;
    clientSecret?: string | null;
    msTenantId?: string | null;
    autoProvisionUsers?: boolean;
    allowedDomains?: string[];
  } | null>(null);

  // Shared SSO provider state
  const [tenantDomain, setTenantDomain] = useState<TenantDomainInfo | null>(null);
  const [isDomainLoading, setIsDomainLoading] = useState(true);
  const [isAutoProvisionUpdating, setIsAutoProvisionUpdating] = useState(false);

  const { fetchAvailableProviders, fetchProviderConfig, updateProviderConfig, toggleProviderEnabled } = useSsoConfig();
  const { fetchTenantDomain, updateSharedAutoProvision } = useTenantDomain();
  const { toast } = useToast();
  const router = useRouter();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1) Fetch available providers
      const available = await fetchAvailableProviders();

      // 2) For each provider fetch its config in parallel
      const configs = await Promise.all(available.map(p => fetchProviderConfig(p.provider)));

      const rows: UiProviderRow[] = available.map((p, idx) => {
        const cfg = configs[idx];
        const isEnabled = cfg?.enabled === true;
        return {
          id: p.provider,
          provider: p.provider,
          displayName: p.displayName,
          status: {
            label: isEnabled ? 'ACTIVE' : 'INACTIVE',
            variant: isEnabled ? 'success' : 'grey',
          },
          hasConfig: Boolean(cfg?.clientId || cfg?.clientSecret),
          allowedDomains: cfg?.allowedDomains || [],
          autoProvisionUsers: cfg?.autoProvisionUsers || false,
          original: { available: p, config: cfg },
        };
      });

      setProviders(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SSO providers');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAvailableProviders, fetchProviderConfig]);

  // Load tenant domain info for shared SSO provider
  const loadDomainData = useCallback(async () => {
    setIsDomainLoading(true);
    try {
      const domainInfo = await fetchTenantDomain();
      setTenantDomain(domainInfo);
    } catch (err) {
      console.error('Failed to load tenant domain:', err);
      // Don't set error state - shared SSO section will just not show
      setTenantDomain(null);
    } finally {
      setIsDomainLoading(false);
    }
  }, [fetchTenantDomain]);

  // Handle shared auto provision toggle
  const handleAutoProvisionToggle = useCallback(
    async (enabled: boolean) => {
      if (!tenantDomain || tenantDomain.generic) return;

      setIsAutoProvisionUpdating(true);
      try {
        const result = await updateSharedAutoProvision(enabled);

        if (result.error) {
          toast({
            title: 'Auto Provision Failed',
            description: result.error.message,
            variant: 'destructive',
            duration: 5000,
          });
          return;
        }

        // Update local state
        setTenantDomain(prev => (prev ? { ...prev, autoAllow: enabled } : null));

        toast({
          title: enabled ? 'Auto Provision Enabled' : 'Auto Provision Disabled',
          description: enabled
            ? `Users from ${tenantDomain.domain} can now sign in via shared Google and Microsoft SSO.`
            : 'Auto provision for shared SSO providers has been disabled.',
          variant: 'success',
          duration: 4000,
        });
      } catch (err) {
        toast({
          title: 'Update Failed',
          description: err instanceof Error ? err.message : 'Failed to update auto provision setting',
          variant: 'destructive',
          duration: 5000,
        });
      } finally {
        setIsAutoProvisionUpdating(false);
      }
    },
    [tenantDomain, updateSharedAutoProvision, toast],
  );

  useEffect(() => {
    loadData();
    loadDomainData();
  }, [loadData, loadDomainData]);

  const columns = useMemo<ColumnDef<UiProviderRow>[]>(() => {
    const baseColumns: ColumnDef<UiProviderRow>[] = [
      {
        accessorKey: 'provider',
        header: 'OAUTH PROVIDER',
        cell: ({ row }: { row: Row<UiProviderRow> }) => (
          <div className="flex items-center gap-3">
            {getProviderIcon(row.original.provider)}
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary truncate">
                {row.original.displayName}
              </span>
              <span className="font-['Azeret_Mono'] font-normal text-[12px] leading-[16px] text-ods-text-secondary truncate uppercase">
                {row.original.provider}
              </span>
            </div>
          </div>
        ),
        meta: { width: 'flex-[2] min-w-0' },
      },
      {
        accessorKey: 'status',
        header: 'STATUS',
        cell: ({ row }: { row: Row<UiProviderRow> }) => (
          <div className="w-fit">
            <Tag label={row.original.status.label} variant={row.original.status.variant} />
          </div>
        ),
        meta: { width: 'flex-1 min-w-0' },
      },
    ];

    // Only add allowed domains column if feature is enabled
    if (isDomainAllowlistEnabled) {
      baseColumns.push({
        accessorKey: 'allowedDomains',
        header: 'ALLOWED DOMAINS',
        cell: ({ row }: { row: Row<UiProviderRow> }) => (
          <span className="font-['DM_Sans'] text-[14px] leading-[18px] text-ods-text-secondary truncate block">
            {row.original.allowedDomains.length > 0 ? row.original.allowedDomains.join(', ') : 'None'}
          </span>
        ),
        meta: { width: 'flex-[1.5] min-w-0' },
      });
    }

    baseColumns.push({
      accessorKey: 'hasConfig',
      header: 'CONFIGURATION',
      cell: ({ row }: { row: Row<UiProviderRow> }) => (
        <span className="font-['DM_Sans'] text-[14px] leading-[18px] text-ods-text-secondary">
          {row.original.hasConfig ? 'Configured' : 'Not configured'}
        </span>
      ),
      meta: { width: 'flex-1 min-w-0' },
    });

    baseColumns.push({
      id: 'actions',
      cell: ({ row }: { row: Row<UiProviderRow> }) => (
        <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
          <Button
            variant="outline"
            leftIcon={<EditProfileIcon className="h-6 w-6 text-ods-text-primary" />}
            onClick={() => {
              setModalState({
                open: true,
                providerKey: row.original.provider,
                displayName: row.original.displayName,
                isEnabled: row.original.status.label === 'ACTIVE',
                clientId: row.original.original?.config?.clientId,
                clientSecret: row.original.original?.config?.clientSecret,
                msTenantId: row.original.original?.config?.msTenantId,
                autoProvisionUsers: row.original.autoProvisionUsers,
                allowedDomains: row.original.allowedDomains,
              });
            }}
          >
            Edit
          </Button>
        </div>
      ),
      enableSorting: false,
      meta: { width: 'min-w-[100px] w-auto shrink-0 flex-none', align: 'right' },
    });

    return baseColumns;
  }, [isDomainAllowlistEnabled]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return providers;
    return providers.filter(p => p.displayName.toLowerCase().includes(term) || p.provider.toLowerCase().includes(term));
  }, [providers, searchTerm]);

  const table = useDataTable<UiProviderRow>({
    data: filtered,
    columns,
    getRowId: (row: UiProviderRow) => row.id,
    enableSorting: false,
  });

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <ListPageContainer
      title="SSO Configurations"
      background="default"
      padding="none"
      className="p-[var(--spacing-system-l)]"
      backButton={{ label: 'Back to Settings', onClick: () => router.push('/settings') }}
    >
      <Input
        startAdornment={<SearchIcon />}
        placeholder="Search SSO providers"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
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
      ) : (
        tenantDomain && (
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
                    Allow any account from {tenantDomain.domain} domain to access OpenFrame via shared SSO providers.
                    Accounts will be auto provisioned upon first sign-in.
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
                    : 'Automatically create user accounts when signing in via shared Google or Microsoft SSO.'
                }
                className="w-full md:w-[400px] md:shrink-0"
              />
            </div>
          </Card>
        )
      )}

      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount />} />
        <DataTable.Body loading={isLoading} emptyMessage="No SSO providers found." rowClassName="mb-1" />
      </DataTable>
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
          if (!modalState?.providerKey) return;
          await updateProviderConfig(modalState.providerKey, {
            clientId,
            clientSecret,
            msTenantId,
            autoProvisionUsers,
            allowedDomains,
          });
          // Also enable the provider after saving
          await toggleProviderEnabled(modalState.providerKey, true);
          await loadData();
        }}
        onDisable={async () => {
          if (!modalState?.providerKey) return;
          await toggleProviderEnabled(modalState.providerKey, false);
          setModalState(null);
          await loadData();
        }}
      />
    </ListPageContainer>
  );
}
