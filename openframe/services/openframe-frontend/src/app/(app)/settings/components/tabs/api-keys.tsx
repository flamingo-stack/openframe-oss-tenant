'use client';

import { DocumentIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  Button,
  type ColumnDef,
  DataTable,
  MoreActionsMenu,
  type PageActionButton,
  PageLayout,
  type Row,
  Tag,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useEffect, useMemo, useState } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { formatDate, formatTime } from '@/lib/format-date';
import { routes } from '@/lib/routes';
import { ApiKeyCreatedModal } from '../../components/api-key-created-modal';
import { ApiKeyDetailsModal } from '../../components/api-key-details-modal';
import { CreateApiKeyModal } from '../../components/create-api-key-modal';
import { DisableApiKeyModal } from '../../components/disable-api-key-modal';
import { RegenerateApiKeyModal } from '../../components/regenerate-api-key-modal';
import { type ApiKeyRecord, useApiKeys } from '../../hooks/use-api-keys';

export function ApiKeysTab() {
  const handleBack = useSafeBack(routes.settings.root());
  const { items, isLoading, error, fetchApiKeys, createApiKey, updateApiKey, regenerateApiKey, setApiKeyEnabled } =
    useApiKeys();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [createdFullKey, setCreatedFullKey] = useState<string | null>(null);
  const [isCreatedOpen, setIsCreatedOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKeyRecord | null>(null);
  const [isRegenOpen, setIsRegenOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const columns = useMemo<ColumnDef<ApiKeyRecord>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'NAME',
        cell: ({ row }: { row: Row<ApiKeyRecord> }) => (
          <div className="flex flex-col min-w-0">
            <TruncateText>{row.original.name}</TruncateText>
            <TruncateText variant="h6" tone="secondary">
              {row.original.description || '—'}
            </TruncateText>
          </div>
        ),
        meta: { width: 'w-1/3' },
      },
      {
        accessorKey: 'status',
        header: 'STATUS',
        cell: ({ row }: { row: Row<ApiKeyRecord> }) => (
          <div className="w-40 shrink-0">
            <Tag
              label={row.original.enabled ? 'ACTIVE' : 'INACTIVE'}
              variant={row.original.enabled ? 'success' : 'grey'}
            />
          </div>
        ),
        meta: { width: 'w-40' },
      },
      {
        accessorKey: 'id',
        header: 'KEY ID',
        cell: ({ row }: { row: Row<ApiKeyRecord> }) => <TruncateText mono>{row.original.id}</TruncateText>,
        meta: { width: 'w-1/3' },
      },
      {
        accessorKey: 'totalRequests',
        header: 'USAGE',
        cell: ({ row }: { row: Row<ApiKeyRecord> }) => (
          <TruncateText>{row.original.totalRequests.toLocaleString()}</TruncateText>
        ),
        meta: { width: 'w-28' },
      },
      {
        accessorKey: 'createdAt',
        header: 'CREATED',
        cell: ({ row }: { row: Row<ApiKeyRecord> }) => (
          <div className="flex flex-col min-w-0">
            <TruncateText>{formatDate(row.original.createdAt)}</TruncateText>
            <TruncateText variant="h6" tone="secondary">
              {formatTime(row.original.createdAt)}
            </TruncateText>
          </div>
        ),
        meta: { width: 'w-40' },
      },
      {
        accessorKey: 'expiresAt',
        header: 'EXPIRES',
        cell: ({ row }: { row: Row<ApiKeyRecord> }) => (
          <div className="flex flex-col min-w-0">
            <TruncateText>{row.original.expiresAt ? formatDate(row.original.expiresAt) : '—'}</TruncateText>
            <TruncateText variant="h6" tone="secondary">
              {row.original.expiresAt ? formatTime(row.original.expiresAt) : '—'}
            </TruncateText>
          </div>
        ),
        meta: { width: 'w-40' },
      },
      {
        id: 'actions',
        cell: ({ row }: { row: Row<ApiKeyRecord> }) => (
          <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
            <MoreActionsMenu
              items={[
                {
                  label: 'Edit',
                  onClick: () => {
                    setSelectedKey(row.original);
                    setIsEditOpen(true);
                  },
                },
                {
                  label: 'Regenerate',
                  onClick: () => {
                    setSelectedKey(row.original);
                    setIsRegenOpen(true);
                  },
                },
                {
                  label: row.original.enabled ? 'Disable' : 'Enable',
                  onClick: () => {
                    if (row.original.enabled) {
                      setSelectedKey(row.original);
                      setIsDisableOpen(true);
                    } else {
                      // Enable without confirmation
                      setApiKeyEnabled(row.original.id, true).then(() => fetchApiKeys());
                    }
                  },
                  danger: row.original.enabled,
                },
              ]}
            />
            <Button
              variant="outline"
              onClick={() => {
                setSelectedKey(row.original);
                setDetailsOpen(true);
              }}
            >
              Details
            </Button>
          </div>
        ),
        enableSorting: false,
        meta: { width: 'min-w-[100px] w-auto shrink-0 flex-none', align: 'right' },
      },
    ],
    [fetchApiKeys, setApiKeyEnabled],
  );

  const table = useDataTable<ApiKeyRecord>({
    data: items,
    columns,
    getRowId: (row: ApiKeyRecord) => row.id,
    enableSorting: false,
  });

  const actions: PageActionButton[] = [
    {
      label: 'API Documentation',
      icon: <DocumentIcon className="w-5 h-5" />,
      variant: 'outline',
      onClick: () => window.open('/swagger-ui/index.html#/', '_blank', 'noopener,noreferrer'),
    },
    {
      label: 'Create API Key',
      icon: <PlusCircleIcon iconSize={20} whiteOverlay />,
      variant: 'outline',
      onClick: () => setIsCreateOpen(true),
    },
  ];

  return (
    <PageLayout
      title="API Keys"
      actions={actions}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)] bg-ods-bg"
      backButton={{ label: 'Back', onClick: handleBack }}
    >
      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount />} />
        <DataTable.Body loading={isLoading} emptyMessage={error || 'No API keys found.'} />
      </DataTable>
      <CreateApiKeyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        create={createApiKey}
        onCreated={async ({ fullKey }) => {
          setIsCreateOpen(false);
          setCreatedFullKey(fullKey);
          setIsCreatedOpen(true);
          await fetchApiKeys();
        }}
      />
      <ApiKeyCreatedModal
        isOpen={isCreatedOpen}
        fullKey={createdFullKey}
        onClose={() => {
          setIsCreatedOpen(false);
          setCreatedFullKey(null);
        }}
      />
      {/* Edit API Key reuse create modal */}
      <CreateApiKeyModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedKey(null);
        }}
        mode="edit"
        initial={
          selectedKey
            ? {
                id: selectedKey.id,
                name: selectedKey.name,
                description: selectedKey.description,
                expiresAt: selectedKey.expiresAt,
              }
            : undefined
        }
        update={updateApiKey}
        onUpdated={async () => {
          setIsEditOpen(false);
          await fetchApiKeys();
        }}
      />
      <ApiKeyDetailsModal
        isOpen={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedKey(null);
        }}
        apiKey={selectedKey}
      />
      <RegenerateApiKeyModal
        isOpen={isRegenOpen}
        onClose={() => {
          setIsRegenOpen(false);
        }}
        apiKeyName={selectedKey?.name}
        onConfirm={async () => {
          if (!selectedKey) return;
          const result = await regenerateApiKey(selectedKey.id);
          await fetchApiKeys();
          setIsRegenOpen(false);
          setCreatedFullKey(result.fullKey);
          setIsCreatedOpen(true);
        }}
      />
      <DisableApiKeyModal
        isOpen={isDisableOpen}
        onClose={() => {
          setIsDisableOpen(false);
        }}
        apiKeyName={selectedKey?.name}
        onConfirm={async () => {
          if (!selectedKey) return;
          await setApiKeyEnabled(selectedKey.id, false);
          await fetchApiKeys();
          setIsDisableOpen(false);
        }}
      />
    </PageLayout>
  );
}
