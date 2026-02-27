import type { ApprovalLevel } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';

import {
  CUSTOM_CREATION_TEMPLATE_ID,
  type CustomPolicyRequest,
  type PolicyTemplateDetail,
  type PolicyTemplateSummary,
} from '../types/ai-policies';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useAiPolicies() {
  const { toast } = useToast();

  const [templates, setTemplates] = useState<PolicyTemplateSummary[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiClient.get<PolicyTemplateSummary[]>('/chat/api/v1/policies');
      if (!res.ok) throw new Error(res.error || 'Failed to fetch policy templates');

      const list = res.data || [];
      setTemplates(list);

      const active = list.find(t => t.isActive)?.id || null;
      setActiveTemplateId(active);

      setSelectedTemplateId(prev => {
        if (prev && list.some(t => t.id === prev)) return prev;
        if (active) return active;
        return list[0]?.id || null;
      });
    } catch (error) {
      toast({
        title: 'Failed to Load AI Policies',
        description: getErrorMessage(error, 'Unable to load policy templates'),
        variant: 'destructive',
        duration: 5000,
      });
      throw error;
    }
  }, [toast]);

  const fetchTemplate = useCallback(
    async (policyId: string) => {
      setIsLoadingTemplate(true);
      try {
        const res = await apiClient.get<PolicyTemplateDetail>(`/chat/api/v1/policies/${encodeURIComponent(policyId)}`);
        if (!res.ok) throw new Error(res.error || 'Failed to fetch policy template');
        setSelectedTemplate(res.data || null);
        return res.data || null;
      } catch (error) {
        toast({
          title: 'Failed to Load Policy',
          description: getErrorMessage(error, 'Unable to load policy'),
          variant: 'destructive',
          duration: 5000,
        });
        throw error;
      } finally {
        setIsLoadingTemplate(false);
      }
    },
    [toast],
  );

  const activateTemplate = useCallback(
    async (policyId: string) => {
      setIsActivating(true);
      try {
        const res = await apiClient.post(`/chat/api/v1/policies/${encodeURIComponent(policyId)}/activate`);
        if (!res.ok) throw new Error(res.error || 'Failed to activate policy template');

        toast({
          title: 'Guardrails Saved',
          description: 'Policy template activated successfully',
          variant: 'success',
          duration: 4000,
        });

        await fetchTemplates();
        await fetchTemplate(policyId);
      } catch (error) {
        toast({
          title: 'Save Failed',
          description: getErrorMessage(error, 'Unable to activate policy template'),
          variant: 'destructive',
          duration: 5000,
        });
        throw error;
      } finally {
        setIsActivating(false);
      }
    },
    [toast, fetchTemplates, fetchTemplate],
  );

  useEffect(() => {
    (async () => {
      try {
        await fetchTemplates();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [fetchTemplates]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setSelectedTemplate(null);
      return;
    }
    if (selectedTemplateId === CUSTOM_CREATION_TEMPLATE_ID) return;

    fetchTemplate(selectedTemplateId).catch(() => {
      // toasts handled in hook
    });
  }, [selectedTemplateId, fetchTemplate]);

  const templateOptions = useMemo(
    () =>
      templates.map(t => ({
        id: t.id,
        label: t.displayName,
        description: t.description,
        isActive: t.isActive,
        type: t.type,
      })),
    [templates],
  );

  const refetchSelectedTemplate = useCallback(() => {
    if (selectedTemplateId && selectedTemplateId !== CUSTOM_CREATION_TEMPLATE_ID) {
      return fetchTemplate(selectedTemplateId);
    }
    return Promise.resolve();
  }, [selectedTemplateId, fetchTemplate]);

  const createOrUpdateCustomPolicy = useCallback(
    async (baseTemplateId: string, overrides: Record<string, ApprovalLevel>) => {
      try {
        const requestBody: CustomPolicyRequest = {
          templateId: baseTemplateId,
          overrides,
        };

        const res = await apiClient.put('/chat/api/v1/policies/custom', requestBody);
        if (!res.ok) throw new Error(res.error || 'Failed to save custom policy');

        toast({
          title: 'Custom Policy Saved',
          description: 'Your custom policy has been created successfully',
          variant: 'success',
          duration: 4000,
        });

        await fetchTemplates();

        return 'custom';
      } catch (error) {
        toast({
          title: 'Save Failed',
          description: getErrorMessage(error, 'Unable to save custom policy'),
          variant: 'destructive',
          duration: 5000,
        });
        throw error;
      }
    },
    [toast, fetchTemplates],
  );

  return {
    templates,
    templateOptions,
    activeTemplateId,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedTemplate,
    isLoading,
    isLoadingTemplate,
    isActivating,
    activateTemplate,
    createOrUpdateCustomPolicy,
    refetchTemplates: fetchTemplates,
    refetchSelectedTemplate,
  };
}
