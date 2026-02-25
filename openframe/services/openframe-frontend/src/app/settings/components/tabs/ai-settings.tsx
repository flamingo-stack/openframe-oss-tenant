'use client';

import type { ApprovalLevel, PermissionCategory } from '@flamingo-stack/openframe-frontend-core';
import {
  Alert,
  AlertDescription,
  Button,
  GoogleGeminiIcon,
  Label,
  OpenAiIcon,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  SlidersIcon,
} from '@flamingo-stack/openframe-frontend-core';
import { PolicyConfigurationPanel } from '@flamingo-stack/openframe-frontend-core/components/features';
import { AiRobotIcon, ClaudeIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { AlertCircle, Edit2, Save, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAiConfiguration } from '../../hooks/use-ai-configuration';
import { useAiPolicies } from '../../hooks/use-ai-policies';
import { CUSTOM_CREATION_TEMPLATE_ID, type PolicyRule, type PolicyTemplateDetail } from '../../types/ai-policies';
import type { CustomPolicyState, EditSnapshot } from '../../types/ai-settings';
import { buildPolicyGroups, clonePolicyGroups, mapToObject } from '../../utils/ai-settings.utils';

const CUSTOM_TEMPLATE_TYPE = 'CUSTOM' as const;

const PROVIDER_CONFIG = {
  ANTHROPIC: {
    apiKey: 'anthropic',
    label: 'Anthropic',
    icon: ClaudeIcon,
  },
  OPENAI: {
    apiKey: 'openai',
    label: 'OpenAI',
    icon: OpenAiIcon,
  },
  GOOGLE_GEMINI: {
    apiKey: 'google-gemini',
    label: 'Google',
    icon: GoogleGeminiIcon,
  },
} as const;

type ProviderKey = keyof typeof PROVIDER_CONFIG;

const API_KEY_TO_PROVIDER: Record<string, ProviderKey> = {
  anthropic: 'ANTHROPIC',
  openai: 'OPENAI',
  'google-gemini': 'GOOGLE_GEMINI',
  google: 'GOOGLE_GEMINI',
};

export function AiSettingsTab() {
  const { toast } = useToast();

  const { configuration, supportedModels, isLoading, isSaving, updateConfiguration } = useAiConfiguration();

  const {
    templateOptions,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedTemplate,
    isLoading: isPoliciesLoading,
    isLoadingTemplate: isPolicyTemplateLoading,
    activeTemplateId,
    isActivating: isPolicyActivating,
    activateTemplate,
    createOrUpdateCustomPolicy,
    refetchSelectedTemplate,
  } = useAiPolicies();

  const [isEditMode, setIsEditMode] = useState(false);
  const [isFetchingBaseTemplate, setIsFetchingBaseTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customTemplate = useMemo(() => templateOptions.find(t => t.type === CUSTOM_TEMPLATE_TYPE), [templateOptions]);
  const hasCustomTemplate = !!customTemplate;

  // Important: rely on the currently selected radio option, not on `selectedTemplate` (which can lag behind while fetching).
  const selectedTemplateOption = useMemo(
    () => templateOptions.find(t => t.id === selectedTemplateId),
    [templateOptions, selectedTemplateId],
  );
  const isSelectedCustomTemplate = selectedTemplateOption?.type === CUSTOM_TEMPLATE_TYPE;
  const canEditPolicyRules =
    isEditMode && (selectedTemplateId === CUSTOM_CREATION_TEMPLATE_ID || isSelectedCustomTemplate);

  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  const [policyGroups, setPolicyGroups] = useState<Map<string, PermissionCategory[]>>(new Map());

  const emptyCustomPolicyState: CustomPolicyState = useMemo(
    () => ({
      enabled: false,
      baseTemplateId: null,
      originalRules: new Map(),
      changes: new Map(),
      existingOverrides: {},
      baseTemplateForDisplay: null,
    }),
    [],
  );

  const [customPolicy, setCustomPolicy] = useState<CustomPolicyState>(emptyCustomPolicyState);

  const editSnapshotRef = useRef<EditSnapshot | null>(null);

  useEffect(() => {
    if (configuration) {
      if (!isEditMode) {
        setSelectedProvider(configuration.provider);
        setSelectedModel(configuration.modelName);
      }
    }
  }, [configuration, isEditMode]);

  useEffect(() => {
    const templateToDisplay =
      customPolicy.enabled && customPolicy.baseTemplateForDisplay
        ? customPolicy.baseTemplateForDisplay
        : selectedTemplate;

    if (!templateToDisplay?.rules) {
      setPolicyGroups(new Map());
      return;
    }

    if (
      selectedTemplate?.type === CUSTOM_TEMPLATE_TYPE &&
      selectedTemplateId !== CUSTOM_CREATION_TEMPLATE_ID &&
      !customPolicy.enabled
    ) {
      const rulesMap = new Map<string, ApprovalLevel>();
      selectedTemplate.rules.forEach((rule: PolicyRule) => {
        rulesMap.set(rule.naturalKey, rule.approvalLevel);
      });

      const existingSourceTemplate = selectedTemplate.sourceTemplate || null;
      if (isEditMode && !editSnapshotRef.current?.customBaseTemplateId && editSnapshotRef.current) {
        editSnapshotRef.current.customBaseTemplateId = existingSourceTemplate;
      }

      setCustomPolicy({
        enabled: true,
        baseTemplateId: existingSourceTemplate,
        originalRules: rulesMap,
        changes: new Map(),
        existingOverrides: (selectedTemplate.customOverrides as Record<string, ApprovalLevel>) || {},
        baseTemplateForDisplay: null,
      });
    }

    const finalGroups = buildPolicyGroups(templateToDisplay.rules as PolicyRule[]);
    setPolicyGroups(finalGroups);
  }, [customPolicy.baseTemplateForDisplay, customPolicy.enabled, selectedTemplate, selectedTemplateId, isEditMode]);

  const resetCustomPolicyState = useCallback(() => {
    setCustomPolicy(emptyCustomPolicyState);
  }, [emptyCustomPolicyState]);

  const handleSave = useCallback(async () => {
    const savePromises: Promise<unknown>[] = [];

    const snapshot = editSnapshotRef.current;
    const aiConfigChanged = !!snapshot && (selectedProvider !== snapshot.provider || selectedModel !== snapshot.model);

    if (aiConfigChanged) {
      savePromises.push(
        updateConfiguration({
          provider: selectedProvider,
          modelName: selectedModel,
        }),
      );
    }

    const hasCustomChanges = customPolicy.changes.size > 0;
    const isEditingCustomTemplate = selectedTemplate?.type === CUSTOM_TEMPLATE_TYPE;
    const isCreatingNewCustomPolicy = customPolicy.enabled && customPolicy.baseTemplateId && !hasCustomTemplate;

    const baseTemplateChanged =
      customPolicy.enabled &&
      !!customPolicy.baseTemplateId &&
      !!snapshot?.customBaseTemplateId &&
      customPolicy.baseTemplateId !== snapshot.customBaseTemplateId;

    const shouldSaveCustomPolicy =
      isCreatingNewCustomPolicy ||
      (customPolicy.enabled && hasCustomChanges) ||
      (isEditingCustomTemplate && hasCustomChanges) ||
      baseTemplateChanged;

    if (shouldSaveCustomPolicy) {
      const overrides: Record<string, ApprovalLevel> = baseTemplateChanged
        ? mapToObject(customPolicy.changes)
        : { ...customPolicy.existingOverrides, ...mapToObject(customPolicy.changes) };

      let templateIdForUpdate: string | null = null;

      if (customPolicy.baseTemplateId) {
        templateIdForUpdate = customPolicy.baseTemplateId;
      } else if (isEditingCustomTemplate) {
        const nonCustomTemplate = templateOptions.find(t => t.type !== CUSTOM_TEMPLATE_TYPE);
        templateIdForUpdate = nonCustomTemplate?.id || 'DEFAULT';
      }

      if (templateIdForUpdate) {
        savePromises.push(
          createOrUpdateCustomPolicy(templateIdForUpdate, overrides).then(async () => {
            resetCustomPolicyState();

            try {
              await refetchSelectedTemplate();
            } catch (_error) {}
          }),
        );
      }
    } else {
      const policyChanged =
        selectedTemplateId &&
        selectedTemplateId !== CUSTOM_CREATION_TEMPLATE_ID &&
        selectedTemplateId !== (snapshot?.templateId || activeTemplateId);

      if (policyChanged) {
        savePromises.push(
          activateTemplate(selectedTemplateId).then(() => {
            if (editSnapshotRef.current) editSnapshotRef.current.templateId = selectedTemplateId;
          }),
        );
      }
    }

    if (savePromises.length > 0) {
      setIsSubmitting(true);
      try {
        await Promise.all(savePromises);
        setIsEditMode(false);
      } catch (_error) {
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsEditMode(false);
    }
  }, [
    activateTemplate,
    activeTemplateId,
    createOrUpdateCustomPolicy,
    customPolicy,
    hasCustomTemplate,
    refetchSelectedTemplate,
    resetCustomPolicyState,
    selectedModel,
    selectedProvider,
    selectedTemplate,
    selectedTemplateId,
    templateOptions,
    updateConfiguration,
  ]);

  const handleCancel = () => {
    const snapshot = editSnapshotRef.current;
    if (snapshot) {
      setSelectedProvider(snapshot.provider);
      setSelectedModel(snapshot.model);
      setSelectedTemplateId(snapshot.templateId || activeTemplateId || null);
      setPolicyGroups(clonePolicyGroups(snapshot.policyGroups));
    } else {
      if (configuration) {
        setSelectedProvider(configuration.provider);
        setSelectedModel(configuration.modelName);
      }
      setSelectedTemplateId(activeTemplateId || null);
    }

    resetCustomPolicyState();
    setIsEditMode(false);
  };

  const beginEditSession = useCallback(() => {
    const currentTemplate = templateOptions.find(t => t.id === (selectedTemplateId || activeTemplateId));
    const customBaseTemplateId =
      currentTemplate?.type === CUSTOM_TEMPLATE_TYPE
        ? selectedTemplate?.sourceTemplate || customPolicy.baseTemplateId || null
        : customPolicy.baseTemplateId || null;

    editSnapshotRef.current = {
      provider: selectedProvider,
      model: selectedModel,
      templateId: selectedTemplateId || activeTemplateId || null,
      policyGroups: clonePolicyGroups(policyGroups),
      customBaseTemplateId,
    };

    setIsEditMode(true);
  }, [
    activeTemplateId,
    customPolicy.baseTemplateId,
    policyGroups,
    selectedModel,
    selectedProvider,
    selectedTemplate,
    selectedTemplateId,
    templateOptions,
  ]);

  const handleProviderChange = useCallback((provider: string) => {
    setSelectedProvider(provider);
    setSelectedModel('');
  }, []);

  const setupCustomPolicy = useCallback(
    (baseTemplate: PolicyTemplateDetail) => {
      const rulesMap = new Map<string, ApprovalLevel>();
      baseTemplate.rules.forEach((rule: PolicyRule) => {
        rulesMap.set(rule.naturalKey, rule.approvalLevel);
      });

      if (isEditMode && editSnapshotRef.current && !editSnapshotRef.current.customBaseTemplateId) {
        editSnapshotRef.current.customBaseTemplateId = baseTemplate.id;
      }

      setCustomPolicy(prev => ({
        ...prev,
        enabled: true,
        baseTemplateId: baseTemplate.id,
        originalRules: rulesMap,
        changes: new Map(),
        baseTemplateForDisplay: baseTemplate,
      }));
    },
    [isEditMode],
  );

  const handleUseForCustomPolicy = useCallback(
    async (templateId: string) => {
      setIsFetchingBaseTemplate(true);
      try {
        const res = await apiClient.get<PolicyTemplateDetail>(
          `/chat/api/v1/policies/${encodeURIComponent(templateId)}`,
        );
        if (!res.ok) throw new Error(res.error || 'Failed to fetch base template');

        const baseTemplate = res.data;
        if (baseTemplate) {
          setupCustomPolicy(baseTemplate);

          if (customTemplate) {
            setSelectedTemplateId(customTemplate.id);
            setCustomPolicy(prev => ({ ...prev, existingOverrides: {} }));
          } else {
            setSelectedTemplateId(CUSTOM_CREATION_TEMPLATE_ID);
          }
        }
      } catch (error) {
        toast({
          title: 'Failed to Load Base Template',
          description: error instanceof Error ? error.message : 'Unable to load template for custom policy',
          variant: 'destructive',
          duration: 5000,
        });
      } finally {
        setIsFetchingBaseTemplate(false);
      }
    },
    [customTemplate, setupCustomPolicy, toast, setSelectedTemplateId],
  );

  const handlePolicyCategoryToggle = (policyGroupName: string, categoryId: string) => {
    setPolicyGroups(prev => {
      const newGroups = new Map(prev);
      const categories = newGroups.get(policyGroupName);
      if (categories) {
        newGroups.set(
          policyGroupName,
          categories.map(cat => (cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat)),
        );
      }
      return newGroups;
    });
  };

  const handlePolicyGlobalPermissionChange = (
    policyGroupName: string,
    categoryId: string,
    level: ApprovalLevel | undefined,
  ) => {
    if (!canEditPolicyRules) return;

    setPolicyGroups(prev => {
      const newGroups = new Map(prev);
      const categories = newGroups.get(policyGroupName);
      if (categories) {
        newGroups.set(
          policyGroupName,
          categories.map(cat => {
            if (cat.id !== categoryId) return cat;
            const updated = { ...cat, globalPermission: level };
            if (level) {
              updated.policies = cat.policies.map(p => ({ ...p, approvalLevel: level }));
            }
            return updated;
          }),
        );
      }
      return newGroups;
    });

    if (customPolicy.enabled && level) {
      setCustomPolicy(prev => {
        const next = new Map(prev.changes);
        const categories = policyGroups.get(policyGroupName);
        const category = categories?.find(c => c.id === categoryId);
        category?.policies.forEach(p => {
          const originalLevel = prev.originalRules.get(p.naturalKey);
          if (originalLevel === level) next.delete(p.naturalKey);
          else next.set(p.naturalKey, level);
        });
        return { ...prev, changes: next };
      });
    }
  };

  const handlePolicyPermissionChange = (
    policyGroupName: string,
    categoryId: string,
    policyId: string,
    level: ApprovalLevel,
  ) => {
    if (!canEditPolicyRules) return;

    setPolicyGroups(prev => {
      const newGroups = new Map(prev);
      const categories = newGroups.get(policyGroupName);
      if (categories) {
        newGroups.set(
          policyGroupName,
          categories.map(cat =>
            cat.id === categoryId
              ? {
                  ...cat,
                  policies: cat.policies.map(p => (p.id === policyId ? { ...p, approvalLevel: level } : p)),
                }
              : cat,
          ),
        );
      }
      return newGroups;
    });

    if (customPolicy.enabled) {
      const naturalKey = policyId;
      setCustomPolicy(prev => {
        const next = new Map(prev.changes);
        const originalLevel = prev.originalRules.get(naturalKey);
        if (originalLevel === level) next.delete(naturalKey);
        else next.set(naturalKey, level);
        return { ...prev, changes: next };
      });
    }
  };

  const getAvailableModels = () => {
    if (!selectedProvider) return [];
    const config = PROVIDER_CONFIG[selectedProvider as ProviderKey];
    if (!config) return [];
    return supportedModels[config.apiKey as keyof typeof supportedModels] || [];
  };

  if (isLoading) {
    return (
      <div className="pt-6 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  const ProviderIcon =
    configuration && PROVIDER_CONFIG[configuration.provider as ProviderKey]
      ? PROVIDER_CONFIG[configuration.provider as ProviderKey].icon
      : AiRobotIcon;

  return (
    <div className="pt-6 space-y-8">
      {/* Header with title and edit button */}
      <div className="flex items-center justify-between">
        <h2 className="text-ods-text-primary font-bold text-2xl">AI Settings & Guardrails</h2>
        {!isEditMode ? (
          <Button
            variant="outline"
            leftIcon={<Edit2 className="w-4 h-4" />}
            onClick={beginEditSession}
            className="bg-ods-card border-ods-border text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action"
          >
            Edit Settings
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={
                !selectedProvider ||
                !selectedModel ||
                isSaving ||
                isPolicyActivating ||
                isFetchingBaseTemplate ||
                isSubmitting
              }
              className="bg-ods-accent text-ods-text-on-accent hover:bg-ods-accent/90"
            >
              {isSaving || isPolicyActivating || isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button
              variant="outline"
              leftIcon={<X className="w-4 h-4" />}
              onClick={handleCancel}
              disabled={isSaving || isPolicyActivating || isFetchingBaseTemplate}
              className="bg-ods-card border-ods-border text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* AI Settings Section */}
      <div className="space-y-6">
        {!configuration && !isEditMode ? (
          <Alert className="bg-ods-system-greys-soft-grey border-ods-border">
            <AlertCircle className="h-4 w-4 text-ods-text-secondary" />
            <AlertDescription className="text-ods-text-secondary">
              No AI configuration found. Click "Edit Settings" to set up your AI provider.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="bg-ods-card border border-ods-border rounded-lg p-4">
            <div className="grid grid-cols-4 gap-6">
              {/* Provider Selection - Column 1 */}
              <div className="space-y-2">
                {isEditMode ? (
                  <>
                    <Label htmlFor="provider" className="text-ods-text-primary">
                      Fae LLM Provider
                    </Label>
                    <Select value={selectedProvider} onValueChange={handleProviderChange} disabled={isSaving}>
                      <SelectTrigger
                        id="provider"
                        className="w-full bg-ods-system-greys-soft-grey border-ods-border text-ods-text-primary"
                      >
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent className="bg-ods-card border-ods-border">
                        {Object.keys(supportedModels)
                          .map(apiKey => {
                            const providerKey = API_KEY_TO_PROVIDER[apiKey];
                            if (!providerKey) return null;

                            const config = PROVIDER_CONFIG[providerKey];
                            const Icon = config.icon;

                            return (
                              <SelectItem
                                key={apiKey}
                                value={providerKey}
                                className="text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action"
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <span>{config.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })
                          .filter(Boolean)}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 bg-ods-system-greys-soft-grey rounded-md">
                      <span className="text-ods-text-primary font-medium">
                        {configuration && PROVIDER_CONFIG[configuration.provider as ProviderKey]?.label}
                      </span>
                      <ProviderIcon className="w-5 h-5 text-ods-accent" />
                    </div>
                    <Label className="text-ods-text-secondary text-sm block">Fae LLM Provider</Label>
                  </div>
                )}
              </div>

              {/* Model Selection - Column 2 */}
              <div className="space-y-2">
                {isEditMode ? (
                  <>
                    <Label htmlFor="model" className="text-ods-text-primary">
                      Provider Model
                    </Label>
                    <Select
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                      disabled={!selectedProvider || isSaving}
                    >
                      <SelectTrigger
                        id="model"
                        className="w-full bg-ods-system-greys-soft-grey border-ods-border text-ods-text-primary"
                      >
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent className="bg-ods-card border-ods-border">
                        {getAvailableModels().map(model => (
                          <SelectItem
                            key={model.modelName}
                            value={model.modelName}
                            className="text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{model.displayName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <div>
                    <div className="bg-ods-system-greys-soft-grey rounded-md">
                      {(() => {
                        if (!configuration) return null;
                        const config = PROVIDER_CONFIG[configuration.provider as ProviderKey];
                        if (!config)
                          return <span className="text-ods-text-primary font-medium">{configuration.modelName}</span>;

                        const models = supportedModels[config.apiKey as keyof typeof supportedModels] || [];
                        const currentModel = models.find(m => m.modelName === configuration.modelName);

                        return (
                          <div className="flex items-center justify-between">
                            <span className="text-ods-text-primary font-medium">
                              {currentModel?.displayName || configuration.modelName}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <Label className="text-ods-text-secondary text-sm block">Provider Model</Label>
                  </div>
                )}
              </div>

              {/* Current Policy Template - Column 3 */}
              <div className="space-y-2">
                {!isEditMode && (
                  <div>
                    <div className="bg-ods-system-greys-soft-grey rounded-md">
                      <span className="text-ods-text-primary font-medium">
                        {(() => {
                          const currentTemplateId = selectedTemplateId || activeTemplateId;
                          const currentTemplate = templateOptions.find(t => t.id === currentTemplateId);
                          return currentTemplate?.label || 'None';
                        })()}
                      </span>
                    </div>
                    <Label className="text-ods-text-secondary text-sm block">Fae Guardrails</Label>
                  </div>
                )}
              </div>

              {/* Empty Column 4 */}
              <div></div>
            </div>
          </div>
        )}
      </div>

      {/* AI Guardrails Section */}
      <div className="space-y-6 pt-4">
        <h3 className="text-ods-text-primary font-semibold text-2xl">AI Guardrails</h3>
        <div className="space-y-4">
          {isPoliciesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : templateOptions.length === 0 ? (
            <Alert className="bg-ods-system-greys-soft-grey border-ods-border">
              <AlertCircle className="h-4 w-4 text-ods-text-secondary" />
              <AlertDescription className="text-ods-text-secondary">No policy templates available.</AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Template chooser (shown only in edit mode) */}
              {isEditMode && (
                <div className="bg-ods-card border border-ods-border rounded-md overflow-hidden">
                  <RadioGroup
                    value={
                      customPolicy.enabled && !hasCustomTemplate
                        ? CUSTOM_CREATION_TEMPLATE_ID
                        : selectedTemplateId || ''
                    }
                    onValueChange={v => {
                      if (v === CUSTOM_CREATION_TEMPLATE_ID) {
                        return;
                      }

                      const selectedOpt = templateOptions.find(t => t.id === v);
                      const isSelectingCustomType = selectedOpt?.type === CUSTOM_TEMPLATE_TYPE;

                      if (isSelectingCustomType) {
                        setSelectedTemplateId(v);
                      } else {
                        setSelectedTemplateId(v);
                        resetCustomPolicyState();
                      }
                    }}
                    className="divide-y divide-ods-border gap-0"
                    disabled={isPolicyTemplateLoading || isFetchingBaseTemplate}
                  >
                    {/* All templates */}
                    {templateOptions.map(opt => {
                      const id = `policy-template-${opt.id}`;
                      const isCustomType = opt.type === CUSTOM_TEMPLATE_TYPE;

                      return (
                        <div
                          key={opt.id}
                          className="flex items-start gap-6 pr-6 hover:bg-ods-bg-hover transition-colors"
                        >
                          <div className="flex-1 flex gap-3 p-6">
                            <RadioGroupItem id={id} value={opt.id} className="mt-0.5" />
                            <div className="flex-1">
                              <Label
                                htmlFor={id}
                                className="text-lg font-medium text-ods-text-primary cursor-pointer block mb-1"
                              >
                                {opt.label}
                                {isCustomType &&
                                  (() => {
                                    if (customPolicy.enabled && customPolicy.baseTemplateId) {
                                      const baseTemplate = templateOptions.find(
                                        t => t.id === customPolicy.baseTemplateId,
                                      );
                                      return baseTemplate ? ` (based on ${baseTemplate.label})` : '';
                                    }
                                    if (selectedTemplate?.sourceTemplate) {
                                      const sourceTemplate = templateOptions.find(
                                        t => t.id === selectedTemplate.sourceTemplate,
                                      );
                                      return sourceTemplate ? ` (based on ${sourceTemplate.label})` : '';
                                    }
                                    return '';
                                  })()}
                              </Label>
                              {opt.description && (
                                <p className="text-sm text-ods-text-secondary leading-relaxed">{opt.description}</p>
                              )}
                            </div>
                          </div>
                          {/* Show "Use for Custom" on all non-CUSTOM type templates */}
                          {!isCustomType && (
                            <div className="flex items-center py-6">
                              <Button
                                variant="outline"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleUseForCustomPolicy(opt.id);
                                }}
                                className="sm:!text-sm text-ods-text-primary bg-ods-card border-ods-border hover:bg-ods-bg-hover font-bold !px-4 py-3 h-auto"
                                leftIcon={<SlidersIcon className="w-4 h-4" />}
                                disabled={isPolicyTemplateLoading || isFetchingBaseTemplate}
                              >
                                Use for Custom Policy
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Show custom creation option only when creating new custom and it doesn't exist yet */}
                    {customPolicy.enabled && !hasCustomTemplate && (
                      <div className="flex items-start gap-6 pr-6 hover:bg-ods-system-greys-soft-grey/10 transition-colors">
                        <div className="flex-1 flex gap-3 p-6">
                          <RadioGroupItem
                            id="policy-template-custom-creation"
                            value={CUSTOM_CREATION_TEMPLATE_ID}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor="policy-template-custom-creation"
                              className="text-lg font-medium text-ods-text-primary cursor-pointer block mb-1"
                            >
                              Custom Policy{' '}
                              {customPolicy.baseTemplateId &&
                                `(based on ${templateOptions.find(t => t.id === customPolicy.baseTemplateId)?.label})`}
                            </Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </RadioGroup>
                </div>
              )}

              {isPolicyTemplateLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : policyGroups.size === 0 ? (
                <Alert className="bg-ods-system-greys-soft-grey border-ods-border">
                  <AlertCircle className="h-4 w-4 text-ods-text-secondary" />
                  <AlertDescription className="text-ods-text-secondary">
                    This policy template has no rules.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {Array.from(policyGroups.entries()).map(([policyGroupName, categories]) => (
                    <div key={policyGroupName} className="space-y-2">
                      <Label className="text-sm font-medium text-ods-text-secondary">{policyGroupName}</Label>
                      <PolicyConfigurationPanel
                        categories={categories}
                        editMode={canEditPolicyRules}
                        onCategoryToggle={categoryId => handlePolicyCategoryToggle(policyGroupName, categoryId)}
                        onGlobalPermissionChange={(categoryId, level) =>
                          handlePolicyGlobalPermissionChange(policyGroupName, categoryId, level)
                        }
                        onPolicyPermissionChange={(categoryId, policyId, level) =>
                          handlePolicyPermissionChange(policyGroupName, categoryId, policyId, level)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
