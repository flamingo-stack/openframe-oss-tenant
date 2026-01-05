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
  } = useAIPolicies()

  const [isEditMode, setIsEditMode] = useState(false)

  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [initialProvider, setInitialProvider] = useState<string>('')
  const [initialModel, setInitialModel] = useState<string>('')

  const [policyGroups, setPolicyGroups] = useState<Map<string, PermissionCategory[]>>(new Map())
  const [initialPolicyGroups, setInitialPolicyGroups] = useState<Map<string, PermissionCategory[]>>(new Map())
  const [initialTemplateId, setInitialTemplateId] = useState<string | null>(null)
  
  const [isCustomPolicy, setIsCustomPolicy] = useState(false)
  const [customBaseTemplateId, setCustomBaseTemplateId] = useState<string | null>(null)
  const [originalRules, setOriginalRules] = useState<Map<string, ApprovalLevel>>(new Map())
  const [customPolicyChanges, setCustomPolicyChanges] = useState<Map<string, ApprovalLevel>>(new Map())
  const [pendingCustomTemplateId, setPendingCustomTemplateId] = useState<string | null>(null)

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
    if (!selectedTemplate?.rules) {
      setPolicyGroups(new Map())
      return
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

    for (const rule of selectedTemplate.rules as PolicyRule[]) {
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
  }, [selectedTemplate, selectedTemplateId, pendingCustomTemplateId, isEditMode])

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

    if (isCustomPolicy && customPolicyChanges.size > 0 && customBaseTemplateId) {
      hasChanges = true
      const overrides: Record<string, ApprovalLevel> = {}
      customPolicyChanges.forEach((level, naturalKey) => {
        overrides[naturalKey] = level
      })
      
      savePromises.push(
        createOrUpdateCustomPolicy(customBaseTemplateId, overrides).then(() => {
          setIsCustomPolicy(false)
          setCustomBaseTemplateId(null)
          setOriginalRules(new Map())
          setCustomPolicyChanges(new Map())
        })
      )
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
    setSelectedProvider(initialProvider)
    setSelectedModel(initialModel)
    
    if (isCustomPolicy) {
      if (customBaseTemplateId) {
        setSelectedTemplateId(customBaseTemplateId)
      } else {
        setSelectedTemplateId(initialTemplateId || activeTemplateId || null)
      }
    } else {
      setSelectedTemplateId(initialTemplateId || activeTemplateId || null)
    }
    
    setPolicyGroups(new Map(initialPolicyGroups))
    
    setIsCustomPolicy(false)
    setCustomBaseTemplateId(null)
    setOriginalRules(new Map())
    setCustomPolicyChanges(new Map())
    setPendingCustomTemplateId(null)
    
    setIsEditMode(false)
  }

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider)
    setSelectedModel('')
  }

  const handleUseForCustomPolicy = (templateId: string) => {
    console.log({templateId})
    
    const baseTemplate = selectedTemplate?.id === templateId ? selectedTemplate : null
    
    if (!baseTemplate) {
      setSelectedTemplateId(templateId)
      setPendingCustomTemplateId(templateId)
      return
    }
    
    setupCustomPolicy(baseTemplate)
  }
  
  const setupCustomPolicy = (baseTemplate: PolicyTemplateDetail) => {
    const rulesMap = new Map<string, ApprovalLevel>()
    baseTemplate.rules.forEach((rule: PolicyRule) => {
      rulesMap.set(rule.naturalKey, rule.approvalLevel)
    })
    setOriginalRules(rulesMap)
    setIsCustomPolicy(true)
    setCustomBaseTemplateId(baseTemplate.id)
    setSelectedTemplateId('CUSTOM_CREATION') 
    setCustomPolicyChanges(new Map())
    setPendingCustomTemplateId(null)
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
              disabled={(!selectedProvider || !selectedModel) || isSaving || isPolicyActivating}
              className="bg-ods-accent text-ods-text-on-accent hover:bg-ods-accent/90"
            >
              {isSaving || isPolicyActivating ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button
              variant="outline"
              leftIcon={<X className="w-4 h-4" />}
              onClick={handleCancel}
              disabled={isSaving || isPolicyActivating}
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
                <div className="space-y-2">
                  <RadioGroup
                    value={isCustomPolicy ? 'CUSTOM_CREATION' : (selectedTemplateId || '')}
                    onValueChange={(v) => {
                      if (v === 'CUSTOM_CREATION') {
                        return
                      }
                      
                      setSelectedTemplateId(v)
                      setIsCustomPolicy(false)
                      setCustomBaseTemplateId(null)
                      setOriginalRules(new Map())
                      setCustomPolicyChanges(new Map())
                    }}
                    className="space-y-2"
                    disabled={isPolicyTemplateLoading}
                  > 
                    {/* Regular templates */}
                    {templateOptions.filter(opt => opt.id !== 'custom' && opt.label?.toLowerCase() !== 'custom').map((opt) => {
                      const id = `policy-template-${opt.id}`
                      return (
                        <div
                          key={opt.id}
                          className="flex items-center gap-3 p-3 rounded-md border border-ods-border bg-ods-card"
                        >
                          <RadioGroupItem id={id} value={opt.id} />
                          <Label htmlFor={id} className="text-ods-text-primary flex-1 cursor-pointer">
                            {opt.label}
                          </Label>
                          {opt.id?.toLowerCase() !== 'custom' && !templateOptions.some(t => t.id === 'custom' || t.label?.toLowerCase() === 'custom') && (
                            <Button
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUseForCustomPolicy(opt.id)
                              }}
                              className="text-ods-text-secondary hover:text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action h-8 w-auto px-2"
                              disabled={isPolicyTemplateLoading}
                            >
                              <span className="text-xs">Use for Custom</span>
                            </Button>
                          )}
                        </div>
                      )
                    })}
                    {/* Show custom policy creation option only when creating new custom policy */}
                    {isCustomPolicy && (
                      <div className="flex items-center gap-3 p-3 rounded-md border border-ods-border bg-ods-card">
                        <RadioGroupItem id="policy-template-custom-creation" value="CUSTOM_CREATION" />
                        <Label htmlFor="policy-template-custom-creation" className="text-ods-text-primary flex-1 cursor-pointer">
                          Custom Policy {customBaseTemplateId && `(based on ${templateOptions.find(t => t.id === customBaseTemplateId)?.label})`}
                        </Label>
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