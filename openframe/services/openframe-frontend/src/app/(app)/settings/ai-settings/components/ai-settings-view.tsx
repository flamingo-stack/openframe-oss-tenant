'use client';

import { Button, Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  useAdminAiConfig,
  useClientAiConfig,
  useUpdateAdminAiConfig,
  useUpdateClientAiConfig,
} from '../hooks/use-agent-ai-config';
import { useClientView, useUpdateClientView } from '../hooks/use-client-view';
import { useUpdateAiConfiguration } from '../hooks/use-update-ai-configuration';
import {
  type AgentAiConfig,
  type AgentAiConfigInput,
  getDefaultAgentAiConfig,
  getDefaultClientView,
} from '../types/ai-settings';
import type { CustomerAiAssistantSubmit } from '../types/customer-ai-assistant.types';
import { MINGO_AI_CHAT_FORM_ID } from '../types/mingo-ai-chat.types';
import { useAiSettingsActions } from './ai-settings-actions';
import { AiSettingsLayout } from './ai-settings-layout';
import { type AiSettingsTabId, AiSettingsTabs, getVisibleAiSettingsTabs } from './ai-settings-tabs';
import { CUSTOMER_AI_ASSISTANT_FORM_ID, CustomerAiAssistantTab } from './customer-ai-assistant-tab';
import { GUARDRAILS_FORM_ID, GuardrailsTab } from './guardrails-tab';
import { MingoAiChatTab } from './mingo-ai-chat-tab';

const FORM_ID_BY_TAB: Record<AiSettingsTabId, string> = {
  customer: CUSTOMER_AI_ASSISTANT_FORM_ID,
  mingo: MINGO_AI_CHAT_FORM_ID,
  guardrails: GUARDRAILS_FORM_ID,
};

export function AiSettings() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Tabs are feature-flag gated; default to the first one that's visible.
  const visibleTabs = getVisibleAiSettingsTabs();
  const firstTabId = (visibleTabs[0]?.id as AiSettingsTabId | undefined) ?? 'guardrails';

  // Deep-link support: `?tab=<id>&edit=true` opens a tab in edit mode
  // (e.g. "Edit Default Appearance" on the customer edit page).
  const tabParam = searchParams.get('tab') as AiSettingsTabId | null;
  const initialTab = tabParam && visibleTabs.some(tab => tab.id === tabParam) ? tabParam : firstTabId;

  const [activeTab, setActiveTab] = useState<AiSettingsTabId>(initialTab);
  const [isEditMode, setIsEditMode] = useState(searchParams.get('edit') === 'true');

  // Fall back to a visible tab if the active one is hidden by a flag.
  const effectiveTab: AiSettingsTabId = visibleTabs.some(tab => tab.id === activeTab) ? activeTab : firstTabId;
  const isCustomer = effectiveTab === 'customer';
  const isMingo = effectiveTab === 'mingo';

  // CLIENT screen needs the client AI config + client view; ADMIN needs the
  // admin AI config. Queries are gated by tab so only the active one fetches.
  const clientAi = useClientAiConfig({ enabled: isCustomer });
  const clientView = useClientView(null, { enabled: isCustomer });
  const adminAi = useAdminAiConfig({ enabled: isMingo });

  const { update: updateClientAiConfig } = useUpdateClientAiConfig();
  const { update: updateClientView } = useUpdateClientView(null);
  const { update: updateAdminAiConfig } = useUpdateAdminAiConfig();
  const { updateAiConfiguration } = useUpdateAiConfiguration();

  // No record yet → start from defaults so the first save creates one.
  const clientAiConfig = clientAi.config ?? getDefaultAgentAiConfig('CLIENT');
  const view = clientView.view ?? getDefaultClientView();
  const adminAiConfig = adminAi.config ?? getDefaultAgentAiConfig('ADMIN');

  const customerLoading = (clientAi.isLoading && !clientAi.config) || (clientView.isLoading && !clientView.view);
  const customerError = (!clientAi.config && clientAi.error) || (!clientView.view && clientView.error);
  const mingoLoading = adminAi.isLoading && !adminAi.config;
  const mingoError = !adminAi.config && adminAi.error;

  const isLoading = isCustomer ? customerLoading : isMingo ? mingoLoading : false;
  const hasLoadError = isCustomer ? Boolean(customerError) : isMingo ? Boolean(mingoError) : false;

  const refetchActive = useCallback(() => {
    if (isCustomer) {
      clientAi.refetch();
      clientView.refetch();
    } else if (isMingo) {
      adminAi.refetch();
    }
  }, [isCustomer, isMingo, clientAi.refetch, clientView.refetch, adminAi.refetch]);

  const handleEdit = useCallback(() => setIsEditMode(true), []);

  // Switching tabs drops any in-progress edit back to the read-only view.
  const handleTabChange = useCallback((id: AiSettingsTabId) => {
    setActiveTab(id);
    setIsEditMode(false);
  }, []);

  const handleSave = useCallback(() => {
    const form = document.getElementById(FORM_ID_BY_TAB[effectiveTab]);
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  }, [effectiveTab]);

  // The active AI configuration (provider/model) is still mirrored to the chat
  // backend's REST endpoint, which owns the real LLM integration.
  const syncAiConfiguration = useCallback(
    (input: AgentAiConfigInput, current: AgentAiConfig) => {
      if (
        input.llmProvider &&
        input.providerModel &&
        (input.llmProvider !== current.llmProvider || input.providerModel !== current.providerModel)
      ) {
        updateAiConfiguration({ provider: input.llmProvider, modelName: input.providerModel });
      }
    },
    [updateAiConfiguration],
  );

  const handleCustomerSubmit = useCallback(
    (payload: CustomerAiAssistantSubmit) => {
      // The CLIENT screen writes two collections; surface one combined toast.
      void (async () => {
        try {
          await Promise.all([updateClientAiConfig(payload.ai), updateClientView(payload.view)]);
          syncAiConfiguration(payload.ai, clientAiConfig);
          toast({ title: 'Saved', description: 'AI assistant settings updated', variant: 'success' });
          setIsEditMode(false);
        } catch (err) {
          toast({
            title: 'Save failed',
            description: err instanceof Error ? err.message : 'Failed to save settings',
            variant: 'destructive',
          });
        }
      })();
    },
    [updateClientAiConfig, updateClientView, syncAiConfiguration, clientAiConfig, toast],
  );

  const handleMingoSubmit = useCallback(
    (input: AgentAiConfigInput) => {
      void (async () => {
        try {
          await updateAdminAiConfig(input);
          syncAiConfiguration(input, adminAiConfig);
          toast({ title: 'Saved', description: 'Mingo AI settings updated', variant: 'success' });
          setIsEditMode(false);
        } catch (err) {
          toast({
            title: 'Save failed',
            description: err instanceof Error ? err.message : 'Failed to save settings',
            variant: 'destructive',
          });
        }
      })();
    },
    [updateAdminAiConfig, syncAiConfiguration, adminAiConfig, toast],
  );

  const actions = useAiSettingsActions({
    isEditMode,
    onEdit: handleEdit,
    onSave: handleSave,
  });

  // Disabled (not hidden) while loading to avoid a flash; hidden on load error.
  const headerActions = hasLoadError
    ? undefined
    : isLoading
      ? actions.map(action => ({ ...action, disabled: true }))
      : actions;

  return (
    <AiSettingsLayout actions={headerActions} mobileBottomActions={isEditMode}>
      <AiSettingsTabs activeTab={effectiveTab} onTabChange={handleTabChange}>
        {activeId => {
          // Keep the tab bar visible; show skeletons while the tab config loads.
          if (isLoading) {
            return (
              <div className="flex flex-col gap-[var(--spacing-system-l)]">
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-64 w-full rounded-md" />
              </div>
            );
          }

          // Load failed with nothing cached: error + retry instead of editable
          // defaults, so real settings can't be overwritten on save.
          if (hasLoadError) {
            return (
              <div className="flex flex-col items-start gap-[var(--spacing-system-m)]">
                <p className="text-ods-text-secondary">
                  Couldn't load AI settings. The service may be temporarily unavailable.
                </p>
                <Button variant="outline" onClick={refetchActive}>
                  Retry
                </Button>
              </div>
            );
          }

          if (activeId === 'guardrails') {
            return <GuardrailsTab isEditMode={isEditMode} onSaved={() => setIsEditMode(false)} />;
          }

          if (activeId === 'customer') {
            return (
              <CustomerAiAssistantTab
                aiConfig={clientAiConfig}
                view={view}
                isEditMode={isEditMode}
                onSubmit={handleCustomerSubmit}
              />
            );
          }

          return <MingoAiChatTab aiConfig={adminAiConfig} isEditMode={isEditMode} onSubmit={handleMingoSubmit} />;
        }}
      </AiSettingsTabs>
    </AiSettingsLayout>
  );
}
