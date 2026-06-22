'use client';

import type { ApprovalLevel, PermissionCategory } from '@flamingo-stack/openframe-frontend-core';
import {
  Alert,
  AlertDescription,
  Button,
  Label,
  RadioGroupBlock,
  Skeleton,
  SlidersIcon,
} from '@flamingo-stack/openframe-frontend-core';
import { PolicyConfigurationPanel } from '@flamingo-stack/openframe-frontend-core/components/features';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InfoCell } from '@/app/components/shared/info-cell';
import { apiClient } from '@/lib/api-client';
import { useAiPolicies } from '../../hooks/use-ai-policies';
import { CUSTOM_CREATION_TEMPLATE_ID, type PolicyRule, type PolicyTemplateDetail } from '../../types/ai-policies';
import type { CustomPolicyState, EditSnapshot } from '../../types/ai-settings';
import { buildPolicyGroups, clonePolicyGroups, mapToObject } from '../../utils/ai-settings.utils';

const CUSTOM_TEMPLATE_TYPE = 'CUSTOM' as const;

export const GUARDRAILS_FORM_ID = 'ai-settings-guardrails-form';

interface GuardrailsTabProps {
  /** Driven by the shared AI Settings edit mode. */
  isEditMode: boolean;
  /** Called after a successful save so the parent can exit edit mode. */
  onSaved: () => void;
}

// Self-contained legacy tab: renders read-only or editable content based on
// `isEditMode`, and exposes its edit form via GUARDRAILS_FORM_ID for the shared Save.
export function GuardrailsTab({ isEditMode, onSaved }: GuardrailsTabProps) {
  const { toast } = useToast();
  // Set right before `onSaved()` so the edit-mode effect skips the cancel-revert.
  const savedRef = useRef(false);

  const {
    templateOptions,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedTemplate,
    isLoading: isPoliciesLoading,
    isLoadingTemplate: isPolicyTemplateLoading,
    activeTemplateId,
    activateTemplate,
    createOrUpdateCustomPolicy,
    refetchSelectedTemplate,
  } = useAiPolicies();

  const [isFetchingBaseTemplate, setIsFetchingBaseTemplate] = useState(false);
  const isSubmittingRef = useRef(false);

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

  // Label of the active guardrails preset, shown in the read-only summary.
  const selectedPresetLabel = useMemo(() => {
    const currentTemplateId = selectedTemplateId || activeTemplateId;
    return templateOptions.find(t => t.id === currentTemplateId)?.label || 'None';
  }, [templateOptions, selectedTemplateId, activeTemplateId]);

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

  // Latest pending rule edits, readable from the rebuild effect without
  // re-running it (and collapsing the panel) on every permission change.
  const customChangesRef = useRef(customPolicy.changes);
  customChangesRef.current = customPolicy.changes;

  // Which template the current policyGroups were built from; session-only UI
  // state (expansion, global permissions) must not survive a template switch.
  const groupsSourceIdRef = useRef<string | null>(null);

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

    // Rebuild from the template rules. While the same template stays on
    // screen, keep what the user already did this session: expanded
    // categories, pending rule edits and (in edit mode only) chosen global
    // permissions — background refetches must not visually revert those.
    // Switching templates or leaving edit mode drops session-only state so
    // the preview always matches what a reload would show.
    const sourceId = templateToDisplay.id;
    const isSameSource = groupsSourceIdRef.current === sourceId;
    groupsSourceIdRef.current = sourceId;
    const changes = customChangesRef.current;
    setPolicyGroups(prev => {
      const next = buildPolicyGroups(templateToDisplay.rules as PolicyRule[]);
      for (const [groupName, categories] of next) {
        const prevCategories = isSameSource ? prev.get(groupName) : undefined;
        next.set(
          groupName,
          categories.map(cat => {
            const prevCat = prevCategories?.find(c => c.id === cat.id);
            return {
              ...cat,
              isExpanded: prevCat?.isExpanded ?? cat.isExpanded,
              globalPermission: isEditMode ? prevCat?.globalPermission : undefined,
              policies: cat.policies.map(p => {
                const pendingLevel = changes.get(p.naturalKey);
                return pendingLevel ? { ...p, approvalLevel: pendingLevel } : p;
              }),
            };
          }),
        );
      }
      return next;
    });
  }, [customPolicy.baseTemplateForDisplay, customPolicy.enabled, selectedTemplate, selectedTemplateId, isEditMode]);

  const resetCustomPolicyState = useCallback(() => {
    setCustomPolicy(emptyCustomPolicyState);
  }, [emptyCustomPolicyState]);

  const handleSave = useCallback(async () => {
    // Guard against submissions outside an edit session (e.g. stray form
    // submits) and against double-submits while a save is in flight.
    if (!isEditMode || isSubmittingRef.current) return;

    const savePromises: Promise<unknown>[] = [];

    const snapshot = editSnapshotRef.current;

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
      isSubmittingRef.current = true;
      try {
        await Promise.all(savePromises);
        savedRef.current = true;
        onSaved();
      } catch (_error) {
      } finally {
        isSubmittingRef.current = false;
      }
    } else {
      savedRef.current = true;
      onSaved();
    }
  }, [
    isEditMode,
    onSaved,
    activateTemplate,
    activeTemplateId,
    createOrUpdateCustomPolicy,
    customPolicy,
    hasCustomTemplate,
    refetchSelectedTemplate,
    resetCustomPolicyState,
    selectedTemplate,
    selectedTemplateId,
    templateOptions,
  ]);

  const revertEdits = () => {
    const snapshot = editSnapshotRef.current;
    if (snapshot) {
      setSelectedTemplateId(snapshot.templateId || activeTemplateId || null);
      setPolicyGroups(clonePolicyGroups(snapshot.policyGroups));
    } else {
      setSelectedTemplateId(activeTemplateId || null);
    }

    resetCustomPolicyState();
  };

  const beginEditSession = useCallback(() => {
    const currentTemplate = templateOptions.find(t => t.id === (selectedTemplateId || activeTemplateId));
    const customBaseTemplateId =
      currentTemplate?.type === CUSTOM_TEMPLATE_TYPE
        ? selectedTemplate?.sourceTemplate || customPolicy.baseTemplateId || null
        : customPolicy.baseTemplateId || null;

    editSnapshotRef.current = {
      templateId: selectedTemplateId || activeTemplateId || null,
      policyGroups: clonePolicyGroups(policyGroups),
      customBaseTemplateId,
    };
  }, [
    activeTemplateId,
    customPolicy.baseTemplateId,
    policyGroups,
    selectedTemplate,
    selectedTemplateId,
    templateOptions,
  ]);

  // Shared edit mode drives the session: snapshot on enter, revert on cancel
  // (skipped right after a save). Refs keep the latest handlers without
  // re-running this on every state change.
  const beginEditSessionRef = useRef(beginEditSession);
  beginEditSessionRef.current = beginEditSession;
  const revertEditsRef = useRef(revertEdits);
  revertEditsRef.current = revertEdits;
  const prevEditModeRef = useRef(isEditMode);

  useEffect(() => {
    const prev = prevEditModeRef.current;
    prevEditModeRef.current = isEditMode;
    if (!prev && isEditMode) {
      beginEditSessionRef.current();
    } else if (prev && !isEditMode) {
      if (savedRef.current) savedRef.current = false;
      else revertEditsRef.current();
    }
  }, [isEditMode]);

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

  return (
    // Edit mode + Save are owned by the shared AiSettingsLayout actions;
    // the shared Save submits this form via GUARDRAILS_FORM_ID.
    <form
      id={GUARDRAILS_FORM_ID}
      onSubmit={event => {
        event.preventDefault();
        void handleSave();
      }}
      className="space-y-6"
    >
      {/* Selected guardrails preset (read-only summary) */}
      {!isEditMode &&
        (isPoliciesLoading ? (
          <Skeleton className="h-20 w-full rounded-md" />
        ) : (
          <div className="bg-ods-card border border-ods-border rounded-md flex items-center px-4 min-h-20">
            <InfoCell value={selectedPresetLabel} label="Guardrails Preset" />
          </div>
        ))}

      {/* Guardrails policies */}
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
              <RadioGroupBlock
                name="policy-template"
                variant="grouped"
                value={
                  customPolicy.enabled && !hasCustomTemplate ? CUSTOM_CREATION_TEMPLATE_ID : selectedTemplateId || ''
                }
                onValueChange={v => {
                  if (v === CUSTOM_CREATION_TEMPLATE_ID) return;

                  const selectedOpt = templateOptions.find(t => t.id === v);
                  const isSelectingCustomType = selectedOpt?.type === CUSTOM_TEMPLATE_TYPE;

                  setSelectedTemplateId(v);
                  if (!isSelectingCustomType) resetCustomPolicyState();
                }}
                disabled={isPolicyTemplateLoading || isFetchingBaseTemplate}
                options={[
                  ...templateOptions.map(opt => {
                    const isCustomType = opt.type === CUSTOM_TEMPLATE_TYPE;

                    let labelSuffix = '';
                    if (isCustomType) {
                      if (customPolicy.enabled && customPolicy.baseTemplateId) {
                        const baseTemplate = templateOptions.find(t => t.id === customPolicy.baseTemplateId);
                        if (baseTemplate) labelSuffix = ` (based on ${baseTemplate.label})`;
                      } else if (selectedTemplate?.sourceTemplate) {
                        const sourceTemplate = templateOptions.find(t => t.id === selectedTemplate.sourceTemplate);
                        if (sourceTemplate) labelSuffix = ` (based on ${sourceTemplate.label})`;
                      }
                    }

                    return {
                      value: opt.id,
                      label: `${opt.label}${labelSuffix}`,
                      description: opt.description,
                      trailing: !isCustomType ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUseForCustomPolicy(opt.id);
                          }}
                          className="md:!text-sm text-ods-text-primary bg-ods-card border-ods-border hover:bg-ods-bg-hover font-bold !px-4 py-3 h-auto"
                          leftIcon={<SlidersIcon className="w-4 h-4" />}
                          disabled={isPolicyTemplateLoading || isFetchingBaseTemplate}
                        >
                          Use for Custom Policy
                        </Button>
                      ) : undefined,
                    };
                  }),
                  ...(customPolicy.enabled && !hasCustomTemplate
                    ? [
                        {
                          value: CUSTOM_CREATION_TEMPLATE_ID,
                          label: `Custom Policy${
                            customPolicy.baseTemplateId
                              ? ` (based on ${templateOptions.find(t => t.id === customPolicy.baseTemplateId)?.label})`
                              : ''
                          }`,
                        },
                      ]
                    : []),
                ]}
              />
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
    </form>
  );
}
