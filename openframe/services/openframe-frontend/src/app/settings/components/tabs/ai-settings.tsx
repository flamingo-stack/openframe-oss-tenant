'use client'

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import {
  Card,
  CardHeader,
  CardContent,
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
import { Edit2, Save, X, Shield, Check, AlertCircle, Bot } from 'lucide-react'
import { ClaudeIcon, GoogleLogo, AiRobotIcon } from '@flamingo-stack/openframe-frontend-core/components/icons'
import { useAIConfiguration } from '../../hooks/use-ai-configuration'
import { useAIPolicies, type PolicyRule } from '../../hooks/use-ai-policies'
import { PolicyConfigurationPanel } from '@flamingo-stack/openframe-frontend-core/components/features'
import { toUiKitToolType } from '@lib/tool-labels'

// Provider configuration mapping
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

// Maps API response keys to provider keys
const API_KEY_TO_PROVIDER: Record<string, ProviderKey> = {
  'anthropic': 'ANTHROPIC',
  'openai': 'OPENAI',
  'google-gemini': 'GOOGLE_GEMINI',
  'google': 'GOOGLE_GEMINI' // Handle legacy 'google' key
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
  } = useAIPolicies()

  const [isEditMode, setIsEditMode] = useState(false)

  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')

  const [isPoliciesEditMode, setIsPoliciesEditMode] = useState(false)
  const [policyCategories, setPolicyCategories] = useState<PermissionCategory[]>([])

  useEffect(() => {
    if (configuration) {
      setSelectedProvider(configuration.provider)
      setSelectedModel(configuration.modelName)
    }
  }, [configuration])

  useEffect(() => {
    if (!selectedTemplate?.rules) {
      setPolicyCategories([])
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

    const grouped = new Map<
      string,
      {
        id: string
        name: string
        icon: ReactNode
        policies: PermissionCategory['policies']
      }
    >()

    for (const rule of selectedTemplate.rules as PolicyRule[]) {
      const categoryName = rule.category || rule.policyGroup || 'Other'
      const categoryId = slugify(`${rule.policyGroup}:${categoryName}`) || 'other'

      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, {
          id: categoryId,
          name: categoryName,
          icon: pickCategoryIcon(categoryName),
          policies: [],
        })
      }

      const g = grouped.get(categoryId)!
      g.policies.push({
        id: rule.naturalKey,
        naturalKey: rule.naturalKey,
        name: rule.operation || rule.naturalKey,
        commandPattern: rule.commandPattern,
        toolName: toUiKitToolType(rule.tool),
        approvalLevel: rule.approvalLevel as ApprovalLevel,
      })
    }

    const categories = Array.from(grouped.values())
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

    setPolicyCategories(categories)
  }, [selectedTemplate])

  const handleSave = async () => {
    try {
      await updateConfiguration({
        provider: selectedProvider,
        modelName: selectedModel,
      })

      setIsEditMode(false)
    } catch (error) {
      // Error is already handled in the hook
    }
  }

  const handleCancel = () => {
    if (configuration) {
      setSelectedProvider(configuration.provider)
      setSelectedModel(configuration.modelName)
    }
    setIsEditMode(false)
  }

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider)
    setSelectedModel('')
  }

  const handlePolicyCategoryToggle = (categoryId: string) => {
    setPolicyCategories(prev =>
      prev.map(cat => (cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat))
    )
  }

  const handlePolicyGlobalPermissionChange = (categoryId: string, level: ApprovalLevel | undefined) => {
    setPolicyCategories(prev =>
      prev.map(cat => {
        if (cat.id !== categoryId) return cat
        const updated = { ...cat, globalPermission: level }
        if (level) {
          updated.policies = cat.policies.map(p => ({ ...p, approvalLevel: level }))
        }
        return updated
      })
    )
  }

  const handlePolicyPermissionChange = (categoryId: string, policyId: string, level: ApprovalLevel) => {
    setPolicyCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              policies: cat.policies.map(p => (p.id === policyId ? { ...p, approvalLevel: level } : p)),
            }
          : cat
      )
    )
  }

  const handlePoliciesSave = async () => {
    // Only activate when selecting a different template than the current active one.
    if (!selectedTemplateId || selectedTemplateId === activeTemplateId) {
      setIsPoliciesEditMode(false)
      return
    }

    try {
      await activateTemplate(selectedTemplateId)
      setIsPoliciesEditMode(false)
    } catch {
      // toast handled in hook; keep edit mode open
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
        <Card className="bg-ods-card border-ods-border">
          <CardHeader className="border-b border-ods-border">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8" />
              <Skeleton className="h-6 w-48" />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const ProviderIcon = configuration && PROVIDER_CONFIG[configuration.provider as ProviderKey]
    ? PROVIDER_CONFIG[configuration.provider as ProviderKey].icon
    : AiRobotIcon

  return (
    <div className="pt-6 space-y-6">
      <Card className="bg-ods-card border-ods-border">
        <CardHeader className="border-b border-ods-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ods-text-primary">Fae LLM Settings</h2>
              <p className="text-sm text-ods-text-secondary">Manage your Fae LLM settings</p>
            </div>
            {!isEditMode && (
              <Button
                variant="outline"
                leftIcon={<Edit2 className="w-4 h-4" />}
                onClick={() => setIsEditMode(true)}
                className="bg-ods-card border-ods-border text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action"
              >
                Edit Settings
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {!configuration && !isEditMode ? (
            <Alert className="bg-ods-system-greys-soft-grey border-ods-border">
              <AlertCircle className="h-4 w-4 text-ods-text-secondary" />
              <AlertDescription className="text-ods-text-secondary">
                No AI configuration found. Click "Edit Settings" to set up your AI provider.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label htmlFor="provider" className="text-ods-text-primary">
                  Fae LLM Provider
                </Label>
                {isEditMode ? (
                  <Select
                    value={selectedProvider}
                    onValueChange={handleProviderChange}
                    disabled={isSaving}
                  >
                    <SelectTrigger
                      id="provider"
                      className="w-full bg-ods-card border-ods-border text-ods-text-primary"
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
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-ods-system-greys-soft-grey rounded-md">
                    <ProviderIcon className="w-5 h-5 text-ods-accent" />
                    <span className="text-ods-text-primary font-medium">
                      {configuration && PROVIDER_CONFIG[configuration.provider as ProviderKey]?.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="model" className="text-ods-text-primary">
                  Provider Model
                </Label>
                {isEditMode ? (
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                    disabled={!selectedProvider || isSaving}
                  >
                    <SelectTrigger
                      id="model"
                      className="w-full bg-ods-card border-ods-border text-ods-text-primary"
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
                            <span className="text-ods-text-secondary text-xs ml-2">
                              {(model.contextWindow / 1000).toLocaleString()}k tokens
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 bg-ods-system-greys-soft-grey rounded-md">
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
                          {currentModel && (
                            <span className="text-ods-text-secondary text-sm">
                              {(currentModel.contextWindow / 1000).toLocaleString()}k tokens
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isEditMode && (
                <div className="flex gap-3 pt-4 border-t border-ods-border">
                  <Button
                    variant="primary"
                    leftIcon={<Save className="w-4 h-4" />}
                    onClick={handleSave}
                    disabled={!selectedProvider || !selectedModel || isSaving}
                    className="bg-ods-accent text-ods-text-on-accent hover:bg-ods-accent/90"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<X className="w-4 h-4" />}
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="bg-ods-card border-ods-border text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-ods-card border-ods-border">
        <CardHeader className="border-b border-ods-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ods-text-primary">AI Guardrails</h3>
            </div>
            <Button
              variant="outline"
              leftIcon={isPoliciesEditMode ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              onClick={() => {
                if (isPoliciesEditMode) {
                  handlePoliciesSave()
                } else {
                  setIsPoliciesEditMode(true)
                }
              }}
              className="bg-ods-card border-ods-border text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action"
              disabled={isPoliciesLoading || isPolicyTemplateLoading || isPolicyActivating}
            >
              {isPoliciesEditMode ? (isPolicyActivating ? 'Saving...' : 'Save') : 'Edit Guardrails'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
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
              {/* Read-only current template (shown when not editing) */}
              {!isPoliciesEditMode && (
                <div className="space-y-2">
                  <Label className="text-ods-text-primary">Policy Template</Label>
                  <div className="flex items-center justify-between gap-3 p-3 bg-ods-system-greys-soft-grey rounded-md">
                    <span className="text-ods-text-primary font-medium">
                      {templateOptions.find(t => t.id === (selectedTemplateId || activeTemplateId))?.label ||
                        selectedTemplateId ||
                        activeTemplateId ||
                        '—'}
                    </span>
                    {(selectedTemplateId || activeTemplateId) === activeTemplateId && (
                      <span className="text-xs text-ods-text-secondary">Active</span>
                    )}
                  </div>
                </div>
              )}

              {/* Template chooser (shown only in edit mode) */}
              {isPoliciesEditMode && (
                <div className="space-y-2">
                  <Label className="text-ods-text-primary">Policy Template</Label>
                  <RadioGroup
                    value={selectedTemplateId || ''}
                    onValueChange={(v) => setSelectedTemplateId(v)}
                    className="space-y-2"
                    disabled={isPolicyTemplateLoading}
                  >
                    {templateOptions.map((opt) => {
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
                          {opt.id === activeTemplateId && (
                            <span className="text-xs text-ods-text-secondary">Active</span>
                          )}
                        </div>
                      )
                    })}
                  </RadioGroup>
                </div>
              )}

              {isPolicyTemplateLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : policyCategories.length === 0 ? (
                <Alert className="bg-ods-system-greys-soft-grey border-ods-border">
                  <AlertCircle className="h-4 w-4 text-ods-text-secondary" />
                  <AlertDescription className="text-ods-text-secondary">
                    This policy template has no rules.
                  </AlertDescription>
                </Alert>
              ) : (
                <PolicyConfigurationPanel
                  categories={policyCategories}
                  editMode={isPoliciesEditMode}
                  onCategoryToggle={handlePolicyCategoryToggle}
                  onGlobalPermissionChange={handlePolicyGlobalPermissionChange}
                  onPolicyPermissionChange={handlePolicyPermissionChange}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}