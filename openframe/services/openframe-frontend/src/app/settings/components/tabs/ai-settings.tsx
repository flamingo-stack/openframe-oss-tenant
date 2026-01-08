'use client'

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import {
  Button,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Alert,
  AlertDescription,
  Skeleton,
  OpenAiIcon,
  GoogleGeminiIcon
} from '@flamingo-stack/openframe-frontend-core'
import type { ApprovalLevel, PermissionCategory } from '@flamingo-stack/openframe-frontend-core'
import { Edit2, Save, X, Shield, AlertCircle, Copy } from 'lucide-react'
import { ClaudeIcon, AiRobotIcon } from '@flamingo-stack/openframe-frontend-core/components/icons'
import { useAIConfiguration } from '../../hooks/use-ai-configuration'
import { useAIPolicies, type PolicyRule, type CustomPolicyRequest, type PolicyTemplateDetail } from '../../hooks/use-ai-policies'
import { PolicyConfigurationPanel } from '@flamingo-stack/openframe-frontend-core/components/features'
import { toUiKitToolType } from '@lib/tool-labels'
import { apiClient } from '@lib/api-client'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { SlidersIcon } from '@flamingo-stack/openframe-frontend-core'

const PROVIDER_CONFIG = {
  ANTHROPIC: {
    apiKey: 'anthropic',
    label: 'Anthropic',
    icon: ClaudeIcon
  },
  OPENAI: {
    apiKey: 'openai',
    label: 'OpenAI',
    icon: OpenAiIcon
  },
  GOOGLE_GEMINI: {
    apiKey: 'google-gemini',
    label: 'Google',
    icon: GoogleGeminiIcon
  }
} as const

type ProviderKey = keyof typeof PROVIDER_CONFIG

const API_KEY_TO_PROVIDER: Record<string, ProviderKey> = {
  'anthropic': 'ANTHROPIC',
  'openai': 'OPENAI',
  'google-gemini': 'GOOGLE_GEMINI',
  'google': 'GOOGLE_GEMINI' 
}

export function AISettingsTab() {
  const { toast } = useToast()
  
  const {
    configuration,
    supportedModels,
    isLoading,
    isSaving,
    updateConfiguration
  } = useAIConfiguration()

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
  } = useAIPolicies()

  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false)
  
  // Helper to identify custom template by type
  const customTemplate = templateOptions.find(t => t.type === 'CUSTOM')
  const hasCustomTemplate = !!customTemplate

  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [initialProvider, setInitialProvider] = useState<string>('')
  const [initialModel, setInitialModel] = useState<string>('')

  const [policyGroups, setPolicyGroups] = useState<Map<string, PermissionCategory[]>>(new Map())
  const [initialPolicyGroups, setInitialPolicyGroups] = useState<Map<string, PermissionCategory[]>>(new Map())
  const [initialTemplateId, setInitialTemplateId] = useState<string | null>(null)
  
  const [isCustomPolicy, setIsCustomPolicy] = useState(false)
  const [customBaseTemplateId, setCustomBaseTemplateId] = useState<string | null>(null)
  const [initialCustomBaseTemplateId, setInitialCustomBaseTemplateId] = useState<string | null>(null)
  const [originalRules, setOriginalRules] = useState<Map<string, ApprovalLevel>>(new Map())
  const [customPolicyChanges, setCustomPolicyChanges] = useState<Map<string, ApprovalLevel>>(new Map())
  const [pendingCustomTemplateId, setPendingCustomTemplateId] = useState<string | null>(null)
  const [existingCustomOverrides, setExistingCustomOverrides] = useState<Record<string, ApprovalLevel>>({})
  const [baseTemplateForDisplay, setBaseTemplateForDisplay] = useState<PolicyTemplateDetail | null>(null)

  useEffect(() => {
    if (configuration) {
      setSelectedProvider(configuration.provider)
      setSelectedModel(configuration.modelName)
      
      if (!isEditMode) {
        setInitialProvider(configuration.provider)
        setInitialModel(configuration.modelName)
      }
    }
  }, [configuration, isEditMode])

  useEffect(() => {
    if (!isEditMode && !initialTemplateId && activeTemplateId) {
      setInitialTemplateId(activeTemplateId || null)
    }
  }, [activeTemplateId, initialTemplateId, isEditMode])

  useEffect(() => {
    // Use baseTemplateForDisplay when in custom policy creation mode, otherwise use selectedTemplate
    const templateToDisplay = (isCustomPolicy && baseTemplateForDisplay) ? baseTemplateForDisplay : selectedTemplate
    
    if (!templateToDisplay?.rules) {
      setPolicyGroups(new Map())
      return
    }
    
    // Check if we're selecting an existing CUSTOM template for editing
    if (selectedTemplate?.type === 'CUSTOM' && selectedTemplateId !== 'CUSTOM_CREATION') {
      // Set up for editing existing custom template
      const rulesMap = new Map<string, ApprovalLevel>()
      selectedTemplate.rules.forEach((rule: PolicyRule) => {
        rulesMap.set(rule.naturalKey, rule.approvalLevel)
      })
      
      if (!isCustomPolicy) {
        // When first selecting a CUSTOM template for editing
        setOriginalRules(rulesMap)
        setIsCustomPolicy(true)
        
        // Extract the sourceTemplate from the existing CUSTOM template
        const existingSourceTemplate = selectedTemplate.sourceTemplate || null
        setCustomBaseTemplateId(existingSourceTemplate)
        
        // Track the initial source template ID when entering edit mode
        if (isEditMode && !initialCustomBaseTemplateId) {
          setInitialCustomBaseTemplateId(existingSourceTemplate)
        }
        
        setCustomPolicyChanges(new Map()) // Start with empty changes
        
        // Store existing customOverrides to preserve them when saving
        const overrides = (selectedTemplate.customOverrides as Record<string, ApprovalLevel>) || {}
        setExistingCustomOverrides(overrides)
        console.log('Loading CUSTOM template with sourceTemplate:', existingSourceTemplate, 'overrides:', overrides)
      }
    }

    const slugify = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    const pickCategoryIcon = (name: string) => {
      const n = name.toLowerCase()
      if (n.includes('download')) return <Shield className="w-4 h-4" />
      if (n.includes('upload')) return <Shield className="w-4 h-4" />
      if (n.includes('file')) return <Shield className="w-4 h-4" />
      return <Shield className="w-4 h-4" />
    }

    const groupedByPolicyGroup = new Map<string, Map<string, {
      id: string
      name: string
      icon: ReactNode
      policies: PermissionCategory['policies']
    }>>()

    for (const rule of templateToDisplay.rules as PolicyRule[]) {
      const policyGroupName = rule.policyGroup || 'General'
      const categoryName = rule.category || 'Other'
      const categoryId = slugify(`${policyGroupName}:${categoryName}`) || 'other'

      if (!groupedByPolicyGroup.has(policyGroupName)) {
        groupedByPolicyGroup.set(policyGroupName, new Map())
      }

      const policyGroupMap = groupedByPolicyGroup.get(policyGroupName)!
      
      if (!policyGroupMap.has(categoryId)) {
        policyGroupMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          icon: pickCategoryIcon(categoryName),
          policies: [],
        })
      }

      const category = policyGroupMap.get(categoryId)!
      category.policies.push({
        id: rule.naturalKey,
        naturalKey: rule.naturalKey,
        name: rule.operation || rule.naturalKey,
        commandPattern: rule.commandPattern,
        toolName: toUiKitToolType(rule.tool),
        approvalLevel: rule.approvalLevel as ApprovalLevel,
      })
    }

    const finalGroups = new Map<string, PermissionCategory[]>()
    
    for (const [policyGroupName, categoriesMap] of groupedByPolicyGroup) {
      const categories = Array.from(categoriesMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(c => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          configurationsCount: c.policies.length,
          globalPermission: undefined,
          isExpanded: false,
          policies: c.policies,
        })) satisfies PermissionCategory[]
      
      finalGroups.set(policyGroupName, categories)
    }

    setPolicyGroups(finalGroups)
    
    if (!isEditMode) {
      setInitialPolicyGroups(new Map(
        Array.from(finalGroups.entries()).map(([groupName, categories]) => [
          groupName,
          categories.map(cat => ({ ...cat }))
        ])
      ))
    }
    
    if (pendingCustomTemplateId && selectedTemplate?.id === pendingCustomTemplateId) {
      setupCustomPolicy(selectedTemplate)
      return
    }
    
    if (selectedTemplateId === 'CUSTOM_CREATION') {
      return 
    }
  }, [selectedTemplate, selectedTemplateId, pendingCustomTemplateId, isEditMode, isCustomPolicy, baseTemplateForDisplay])

  const handleSave = async () => {
    let hasChanges = false
    let savePromises = []

    const aiConfigChanged = (selectedProvider !== initialProvider) || (selectedModel !== initialModel)
    
    if (aiConfigChanged) {
      hasChanges = true
      savePromises.push(
        updateConfiguration({
          provider: selectedProvider,
          modelName: selectedModel,
        }).then(() => {
          setInitialProvider(selectedProvider)
          setInitialModel(selectedModel)
        })
      )
    }

    // Check if we have any custom policy changes to save
    const hasCustomChanges = customPolicyChanges.size > 0
    const isEditingCustomTemplate = selectedTemplate?.type === 'CUSTOM'
    const isCreatingNewCustomPolicy = isCustomPolicy && customBaseTemplateId && !hasCustomTemplate
    
    // Check if base template changed for existing custom policy
    // This happens when user clicks "Use for Custom" on a different template while editing existing custom
    const baseTemplateChanged = isCustomPolicy && customBaseTemplateId && 
      initialCustomBaseTemplateId && customBaseTemplateId !== initialCustomBaseTemplateId
    
    // Allow saving if:
    // 1. Creating new custom policy (even without overrides)
    // 2. Editing existing custom with changes
    // 3. Creating custom policy with changes
    // 4. Base template changed for existing custom policy (even without additional changes)
    if (isCreatingNewCustomPolicy || (isCustomPolicy && hasCustomChanges) || (isEditingCustomTemplate && hasCustomChanges) || baseTemplateChanged) {
      hasChanges = true
      
      // If base template changed, don't use existing overrides
      let overrides: Record<string, ApprovalLevel> = {}
      
      if (baseTemplateChanged) {
        // When base template changes, only use new changes
        customPolicyChanges.forEach((level, naturalKey) => {
          overrides[naturalKey] = level
        })
      } else {
        // Otherwise, merge with existing overrides
        overrides = { ...existingCustomOverrides }
        customPolicyChanges.forEach((level, naturalKey) => {
          overrides[naturalKey] = level
        })
      }
      
      console.log('Saving custom policy:', {
        isCreatingNew: isCreatingNewCustomPolicy,
        hasCustomChanges,
        baseTemplateChanged,
        existing: existingCustomOverrides,
        newChanges: Object.fromEntries(customPolicyChanges),
        merged: overrides,
        baseTemplateId: customBaseTemplateId
      })
      
      // Determine the template ID to use for the API call
      let templateIdForUpdate: string | null = null
      
      if (customBaseTemplateId) {
        // Use the current base template ID (either new or changed)
        templateIdForUpdate = customBaseTemplateId
      } else if (isEditingCustomTemplate) {
        // This shouldn't happen now since CUSTOM templates always have baseTemplateId
        // But keep as fallback
        const nonCustomTemplate = templateOptions.find(t => t.type !== 'CUSTOM')
        templateIdForUpdate = nonCustomTemplate?.id || 'DEFAULT'
      }
      
      if (templateIdForUpdate) {
        console.log('Saving custom policy with:', { 
          templateIdForUpdate, 
          overrides, 
          hasCustomChanges, 
          isEditingCustomTemplate,
          isCreatingNewCustomPolicy,
          overrideCount: Object.keys(overrides).length
        })
        savePromises.push(
          createOrUpdateCustomPolicy(templateIdForUpdate, overrides).then(async () => {
            // Clear the custom editing state first
            setIsCustomPolicy(false)
            setCustomBaseTemplateId(null)
            setInitialCustomBaseTemplateId(null)
            setOriginalRules(new Map())
            setCustomPolicyChanges(new Map())
            setExistingCustomOverrides({})
            setBaseTemplateForDisplay(null)
            
            // Wait a bit for templates state to update, then refetch
            await new Promise(resolve => setTimeout(resolve, 200))
            
            // Refetch the selected template to get updated rules
            console.log('Refetching custom template after save...')
            try {
              await refetchSelectedTemplate()
            } catch (error) {
              console.error('Failed to refetch template:', error)
            }
            
            console.log('Custom policy saved successfully')
          })
        )
      } else {
        console.warn('Cannot save custom policy: no template ID available')
      }
    } else {
      const policyChanged = selectedTemplateId && 
        selectedTemplateId !== 'CUSTOM_CREATION' && 
        selectedTemplateId !== (initialTemplateId || activeTemplateId)
      
      if (policyChanged) {
        hasChanges = true
        savePromises.push(
          activateTemplate(selectedTemplateId).then(() => {
            setInitialTemplateId(selectedTemplateId)
          })
        )
      }
    }

    if (hasChanges) {
      try {
        await Promise.all(savePromises)
        setIsEditMode(false)
      } catch (error) {
        
      }
    } else {
      setIsEditMode(false)
    }
  }

  const handleCancel = () => {
    // Reset AI provider settings
    setSelectedProvider(initialProvider)
    setSelectedModel(initialModel)
    
    // Always reset to the initial/active template when canceling
    // Don't use customBaseTemplateId as that's the template being customized, not the actual active one
    setSelectedTemplateId(initialTemplateId || activeTemplateId || null)
    
    // Reset policy groups to initial state
    setPolicyGroups(new Map(initialPolicyGroups))
    
    // Clear all custom policy states
    setIsCustomPolicy(false)
    setCustomBaseTemplateId(null)
    setInitialCustomBaseTemplateId(null)
    setOriginalRules(new Map())
    setCustomPolicyChanges(new Map())
    setPendingCustomTemplateId(null)
    setExistingCustomOverrides({})
    setBaseTemplateForDisplay(null)
    
    setIsEditMode(false)
  }

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider)
    setSelectedModel('')
  }

  const handleUseForCustomPolicy = async (templateId: string) => {
    setIsLoadingTemplate(true)
    try {
      // Always fetch the base template directly from API to get fresh base rules
      const res = await apiClient.get<PolicyTemplateDetail>(
        `/chat/api/v1/policies/${encodeURIComponent(templateId)}`
      )
      if (!res.ok) throw new Error(res.error || 'Failed to fetch base template')
      
      const baseTemplate = res.data
      if (baseTemplate) {
        setupCustomPolicy(baseTemplate)
        
        // If CUSTOM template exists, we're changing its base template
        if (customTemplate) {
          setSelectedTemplateId(customTemplate.id)
          // When changing base template for existing custom, don't preserve overrides
          setExistingCustomOverrides({})
          console.log('Changing base template for existing CUSTOM template to:', templateId)
        } else {
          // Only use CUSTOM_CREATION for new custom policy
          setSelectedTemplateId('CUSTOM_CREATION')
        }
      }
    } catch (error) {
      toast({
        title: 'Failed to Load Base Template',
        description: error instanceof Error ? error.message : 'Unable to load template for custom policy',
        variant: 'destructive',
        duration: 5000
      })
    } finally {
      setIsLoadingTemplate(false)
    }
  }
  
  const setupCustomPolicy = (baseTemplate: PolicyTemplateDetail) => {
    const rulesMap = new Map<string, ApprovalLevel>()
    baseTemplate.rules.forEach((rule: PolicyRule) => {
      rulesMap.set(rule.naturalKey, rule.approvalLevel)
    })
    setOriginalRules(rulesMap)
    setIsCustomPolicy(true)
    setCustomBaseTemplateId(baseTemplate.id)
    
    // Track initial base template only when first entering custom policy mode in this edit session
    if (!initialCustomBaseTemplateId && isEditMode) {
      setInitialCustomBaseTemplateId(baseTemplate.id)
    }
    
    setCustomPolicyChanges(new Map()) // Reset changes when changing base template
    setPendingCustomTemplateId(null)
    
    // When changing base template, always clear existing overrides
    // (they're already cleared in handleUseForCustomPolicy)
    
    // Store the base template for UI display
    setBaseTemplateForDisplay(baseTemplate)
    
    console.log('Setup custom policy with base template:', baseTemplate.id, 'initial:', initialCustomBaseTemplateId, 'isEditMode:', isEditMode)
  }

  const handlePolicyCategoryToggle = (policyGroupName: string, categoryId: string) => {
    setPolicyGroups(prev => {
      const newGroups = new Map(prev)
      const categories = newGroups.get(policyGroupName)
      if (categories) {
        newGroups.set(
          policyGroupName,
          categories.map(cat => (cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat))
        )
      }
      return newGroups
    })
  }

  const handlePolicyGlobalPermissionChange = (policyGroupName: string, categoryId: string, level: ApprovalLevel | undefined) => {
    if (!isEditMode || (!isCustomPolicy && selectedTemplate?.type !== 'CUSTOM')) return
    
    setPolicyGroups(prev => {
      const newGroups = new Map(prev)
      const categories = newGroups.get(policyGroupName)
      if (categories) {
        newGroups.set(
          policyGroupName,
          categories.map(cat => {
            if (cat.id !== categoryId) return cat
            const updated = { ...cat, globalPermission: level }
            if (level) {
              updated.policies = cat.policies.map(p => ({ ...p, approvalLevel: level }))
              
              if (isCustomPolicy) {
                cat.policies.forEach(p => {
                  const originalLevel = originalRules.get(p.naturalKey)
                  if (originalLevel === level) {
                    setCustomPolicyChanges(prev => {
                      const newChanges = new Map(prev)
                      newChanges.delete(p.naturalKey)
                      return newChanges
                    })
                  } else if (level) {
                    setCustomPolicyChanges(prev => new Map(prev).set(p.naturalKey, level))
                  }
                })
              }
            }
            return updated
          })
        )
      }
      return newGroups
    })
  }

  const handlePolicyPermissionChange = (policyGroupName: string, categoryId: string, policyId: string, level: ApprovalLevel) => {
    if (!isEditMode || (!isCustomPolicy && selectedTemplate?.type !== 'CUSTOM')) return
    
    let naturalKey = policyId 
    policyGroups.forEach(categories => {
      categories.forEach(cat => {
        const policy = cat.policies.find(p => p.id === policyId)
        if (policy) {
          naturalKey = policy.naturalKey
        }
      })
    })
    
    setPolicyGroups(prev => {
      const newGroups = new Map(prev)
      const categories = newGroups.get(policyGroupName)
      if (categories) {
        newGroups.set(
          policyGroupName,
          categories.map(cat =>
            cat.id === categoryId
              ? {
                  ...cat,
                  policies: cat.policies.map(p => (p.id === policyId ? { ...p, approvalLevel: level } : p)),
                }
              : cat
          )
        )
      }
      return newGroups
    })
    
    if (isCustomPolicy) {
      const originalLevel = originalRules.get(naturalKey)
      if (originalLevel === level) {
        setCustomPolicyChanges(prev => {
          const newChanges = new Map(prev)
          newChanges.delete(naturalKey)
          return newChanges
        })
      } else {
        setCustomPolicyChanges(prev => new Map(prev).set(naturalKey, level))
      }
    }
  }

  const getAvailableModels = () => {
    if (!selectedProvider) return []
    const config = PROVIDER_CONFIG[selectedProvider as ProviderKey]
    if (!config) return []
    return supportedModels[config.apiKey as keyof typeof supportedModels] || []
  }

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
    )
  }

  const ProviderIcon = configuration && PROVIDER_CONFIG[configuration.provider as ProviderKey]
    ? PROVIDER_CONFIG[configuration.provider as ProviderKey].icon
    : AiRobotIcon

  return (
    <div className="pt-6 space-y-8">
      {/* Header with title and edit button */}
      <div className="flex items-center justify-between">
        <h2 className="text-ods-text-primary font-bold text-2xl">AI Settings & Guardrails</h2>
        {!isEditMode ? (
          <Button
            variant="outline"
            leftIcon={<Edit2 className="w-4 h-4" />}
            onClick={() => {
              setInitialProvider(selectedProvider)
              setInitialModel(selectedModel)
              setInitialTemplateId(selectedTemplateId || activeTemplateId || null)
              setInitialPolicyGroups(new Map(policyGroups))
              
              // If editing an existing CUSTOM template, track its current source template
              const currentTemplate = templateOptions.find(t => t.id === (selectedTemplateId || activeTemplateId))
              if (currentTemplate?.type === 'CUSTOM') {
                const sourceTemplate = selectedTemplate?.sourceTemplate || customBaseTemplateId
                setInitialCustomBaseTemplateId(sourceTemplate)
                setCustomBaseTemplateId(sourceTemplate)
              } else {
                setInitialCustomBaseTemplateId(customBaseTemplateId)
              }
              
              setIsEditMode(true)
            }}
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
              disabled={(!selectedProvider || !selectedModel) || isSaving || isPolicyActivating || isLoadingTemplate}
              className="bg-ods-accent text-ods-text-on-accent hover:bg-ods-accent/90"
            >
              {isSaving || isPolicyActivating ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button
              variant="outline"
              leftIcon={<X className="w-4 h-4" />}
              onClick={handleCancel}
              disabled={isSaving || isPolicyActivating || isLoadingTemplate}
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
                    <Select
                      value={selectedProvider}
                      onValueChange={handleProviderChange}
                      disabled={isSaving}
                    >
                      <SelectTrigger
                        id="provider"
                        className="w-full bg-ods-system-greys-soft-grey border-ods-border text-ods-text-primary"
                      >
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent className="bg-ods-card border-ods-border">
                        {Object.keys(supportedModels).map((apiKey) => {
                          const providerKey = API_KEY_TO_PROVIDER[apiKey]
                          if (!providerKey) return null
                          
                          const config = PROVIDER_CONFIG[providerKey]
                          const Icon = config.icon
                          
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
                          )
                        }).filter(Boolean)}
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
                    <Label className="text-ods-text-secondary text-sm block">
                      Fae LLM Provider
                    </Label>
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
                        {getAvailableModels().map((model) => (
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
                        if (!configuration) return null
                        const config = PROVIDER_CONFIG[configuration.provider as ProviderKey]
                        if (!config) return <span className="text-ods-text-primary font-medium">{configuration.modelName}</span>
                        
                        const models = supportedModels[config.apiKey as keyof typeof supportedModels] || []
                        const currentModel = models.find(m => m.modelName === configuration.modelName)
                        
                        return (
                          <div className="flex items-center justify-between">
                            <span className="text-ods-text-primary font-medium">
                              {currentModel?.displayName || configuration.modelName}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                    <Label className="text-ods-text-secondary text-sm block">
                      Provider Model
                    </Label>
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
                          const currentTemplateId = selectedTemplateId || activeTemplateId
                          const currentTemplate = templateOptions.find(t => t.id === currentTemplateId)
                          return currentTemplate?.label || 'None'
                        })()}
                      </span>
                    </div>
                    <Label className="text-ods-text-secondary text-sm block">
                      Fae Guardrails
                    </Label>
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
              <AlertDescription className="text-ods-text-secondary">
                No policy templates available.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Template chooser (shown only in edit mode) */}
              {isEditMode && (
                <div className="bg-ods-card border border-ods-border rounded-md overflow-hidden">
                  <RadioGroup
                    value={isCustomPolicy && !hasCustomTemplate ? 'CUSTOM_CREATION' : (selectedTemplateId || '')}
                    onValueChange={(v) => {
                      if (v === 'CUSTOM_CREATION') {
                        return // Keep custom creation mode
                      }
                      
                      const selectedOpt = templateOptions.find(t => t.id === v)
                      const isSelectingCustomType = selectedOpt?.type === 'CUSTOM'
                      
                      if (isSelectingCustomType) {
                        // Selecting existing CUSTOM template for editing
                        setSelectedTemplateId(v)
                        // Note: Don't reset states here, let useEffect handle setup
                      } else {
                        // Regular template selection
                        setSelectedTemplateId(v)
                        setIsCustomPolicy(false)
                        setCustomBaseTemplateId(null)
                        setOriginalRules(new Map())
                        setCustomPolicyChanges(new Map())
                      }
                    }}
                    className="divide-y divide-ods-border gap-0"
                    disabled={isPolicyTemplateLoading || isLoadingTemplate}
                  > 
                    {/* All templates including custom if it exists */}
                    {templateOptions.map((opt) => {
                      const id = `policy-template-${opt.id}`
                      const isCustomType = opt.type === 'CUSTOM'
                      
                      return (
                        <div
                          key={opt.id}
                          className="flex items-start gap-6 pr-6 hover:bg-ods-bg-hover transition-colors"
                        >
                          <div className="flex-1 flex gap-3 p-6">
                            <RadioGroupItem 
                              id={id} 
                              value={opt.id}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <Label 
                                htmlFor={id} 
                                className="text-lg font-medium text-ods-text-primary cursor-pointer block mb-1"
                              >
                                {opt.label}
                                {isCustomType && (() => {
                                  // During edit mode with custom policy being modified, show the current base template
                                  if (isCustomPolicy && customBaseTemplateId) {
                                    const baseTemplate = templateOptions.find(t => t.id === customBaseTemplateId)
                                    return baseTemplate ? ` (based on ${baseTemplate.label})` : ''
                                  }
                                  // For existing custom template not being modified, show its source template
                                  if (selectedTemplate?.sourceTemplate) {
                                    const sourceTemplate = templateOptions.find(t => t.id === selectedTemplate.sourceTemplate)
                                    return sourceTemplate ? ` (based on ${sourceTemplate.label})` : ''
                                  }
                                  return ''
                                })()}
                              </Label>
                              {opt.description && (
                                <p className="text-sm text-ods-text-secondary leading-relaxed">
                                  {opt.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Show "Use for Custom" on all non-CUSTOM type templates */}
                          {!isCustomType && (
                            <div className="flex items-center py-6">
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUseForCustomPolicy(opt.id)
                                }}
                                className="text-ods-text-primary bg-ods-card border-ods-border hover:bg-ods-bg-hover font-bold px-4 py-3 h-auto"
                                leftIcon={<SlidersIcon className="w-5 h-5"/>}
                                disabled={isPolicyTemplateLoading || isLoadingTemplate}
                              >
                                Use for Custom Policy
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {/* Show custom creation option only when creating new custom and it doesn't exist yet */}
                    {isCustomPolicy && !hasCustomTemplate && (
                      <div className="flex items-start gap-6 pr-6 hover:bg-ods-system-greys-soft-grey/10 transition-colors">
                        <div className="flex-1 flex gap-3 p-6">
                          <RadioGroupItem 
                            id="policy-template-custom-creation" 
                            value="CUSTOM_CREATION"
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor="policy-template-custom-creation" 
                              className="text-lg font-medium text-ods-text-primary cursor-pointer block mb-1"
                            >
                              Custom Policy {customBaseTemplateId && `(based on ${templateOptions.find(t => t.id === customBaseTemplateId)?.label})`}
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
                      <Label className="text-sm font-medium text-ods-text-secondary">
                        {policyGroupName}
                      </Label>
                      <PolicyConfigurationPanel
                        categories={categories}
                        editMode={isEditMode && (isCustomPolicy || selectedTemplate?.type === 'CUSTOM')}
                        onCategoryToggle={(categoryId) => handlePolicyCategoryToggle(policyGroupName, categoryId)}
                        onGlobalPermissionChange={(categoryId, level) => handlePolicyGlobalPermissionChange(policyGroupName, categoryId, level)}
                        onPolicyPermissionChange={(categoryId, policyId, level) => handlePolicyPermissionChange(policyGroupName, categoryId, policyId, level)}
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
  )
}