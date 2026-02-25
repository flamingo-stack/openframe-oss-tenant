'use client';

import { DocumentIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  Button,
  ListPageContainer,
  MoreActionsMenu,
  StatusTag,
  Table,
  type TableColumn,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import React, { useEffect, useState } from 'react';
import { ApiKeyCreatedModal } from '../../components/api-key-created-modal';
import { ApiKeyDetailsModal } from '../../components/api-key-details-modal';
import { CreateApiKeyModal } from '../../components/create-api-key-modal';
import { DisableApiKeyModal } from '../../components/disable-api-key-modal';
import { RegenerateApiKeyModal } from '../../components/regenerate-api-key-modal';
import { type ApiKeyRecord, useApiKeys } from '../../hooks/use-api-keys';

export function ApiKeysTab() {
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

  const columns: TableColumn<ApiKeyRecord>[] = [
    {
      key: 'name',
      label: 'NAME',
      width: 'w-1/3',
      renderCell: row => (
        <div className="flex flex-col min-w-0">
          <span className="font-['DM_Sans'] font-medium text-[16px] text-ods-text-primary truncate">{row.name}</span>
          <span className="font-['DM_Sans'] text-[14px] text-ods-text-secondary truncate">
            {row.description || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      width: 'w-40',
      renderCell: row => (
        <div className="w-40 shrink-0">
          <StatusTag label={row.enabled ? 'ACTIVE' : 'INACTIVE'} variant={row.enabled ? 'success' : 'info'} />
        </div>
      ),
    },
    {
      key: 'keyId',
      label: 'KEY ID',
      width: 'w-1/3',
      renderCell: row => (
        <div className="truncate font-['Azeret_Mono'] text-[16px] text-ods-text-primary">{row.id}</div>
      ),
    },
    {
      key: 'usage',
      label: 'USAGE',
      width: 'w-28',
      renderCell: row => (
        <div className="truncate font-['DM_Sans'] text-[16px] text-ods-text-primary">
          {row.totalRequests.toLocaleString()}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'CREATED',
      width: 'w-40',
      renderCell: row => (
        <div className="flex flex-col min-w-0">
          <span className="font-['DM_Sans'] font-medium text-[16px] text-ods-text-primary truncate">
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
          <span className="font-['DM_Sans'] text-[14px] text-ods-text-secondary truncate">
            {new Date(row.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
    {
      key: 'expiresAt',
      label: 'EXPIRES',
      width: 'w-40',
      renderCell: row => (
        <div className="flex flex-col min-w-0">
          <span className="font-['DM_Sans'] font-medium text-[16px] text-ods-text-primary truncate">
            {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : '—'}
          </span>
          <span className="font-['DM_Sans'] text-[14px] text-ods-text-secondary truncate">
            {row.expiresAt ? new Date(row.expiresAt).toLocaleTimeString() : '—'}
          </span>
        </div>
      ),
    },
  ];

  const headerActions = (
    <div className="flex items-center gap-3">
      <Button
        onClick={() => window.open('/swagger-ui/index.html#/', '_blank', 'noopener,noreferrer')}
        leftIcon={<DocumentIcon className="w-5 h-5" />}
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
      >
        API Documentation
      </Button>
      <Button
        onClick={() => setIsCreateOpen(true)}
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
        leftIcon={<PlusCircleIcon iconSize={20} whiteOverlay />}
      >
        Create API Key
      </Button>
    </div>
  );

  return (
    <ListPageContainer
      title="API Keys"
      headerActions={headerActions}
      background="default"
      padding="none"
      className="pt-6"
    >
      <Table
        data={items}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        emptyMessage={error || 'No API keys found.'}
        showFilters={false}
        renderRowActions={row => (
          <div className="flex items-center gap-3">
            <MoreActionsMenu
              items={[
                {
                  label: 'Edit',
                  onClick: () => {
                    setSelectedKey(row);
                    setIsEditOpen(true);
                  },
                },
                {
                  label: 'Regenerate',
                  onClick: () => {
                    setSelectedKey(row);
                    setIsRegenOpen(true);
                  },
                },
                {
                  label: row.enabled ? 'Disable' : 'Enable',
                  onClick: () => {
                    if (row.enabled) {
                      setSelectedKey(row);
                      setIsDisableOpen(true);
                    } else {
                      // Enable without confirmation
                      setApiKeyEnabled(row.id, true).then(() => fetchApiKeys());
                    }
                  },
                  danger: row.enabled,
                },
              ]}
            />
            <Button
              variant="outline"
              onClick={() => {
                setSelectedKey(row);
                setDetailsOpen(true);
              }}
            >
              Details
            </Button>
          </div>
        )}
      />
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
    </ListPageContainer>
  );
}
