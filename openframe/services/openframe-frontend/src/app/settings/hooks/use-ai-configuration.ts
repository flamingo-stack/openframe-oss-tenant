import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '@lib/api-client'

interface AIConfiguration {
  id: string
  provider: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE_GEMINI'
  modelName: string
  isActive: boolean
  hasApiKey: boolean
  createdAt: string
  updatedAt: string
}

interface ModelInfo {
  modelName: string
  displayName: string
  provider: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE_GEMINI'
  contextWindow: number
}

interface SupportedModels {
  anthropic?: ModelInfo[]
  openai?: ModelInfo[]
  'google-gemini'?: ModelInfo[]
}

interface UpdateAIConfigurationParams {
  provider: string
  modelName: string
  apiKey?: string
}

export function useAIConfiguration() {
  const [configuration, setConfiguration] = useState<AIConfiguration | null>(null)
  const [supportedModels, setSupportedModels] = useState<SupportedModels>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const fetchConfiguration = useCallback(async () => {
    try {
      const response = await apiClient.get<AIConfiguration>('/chat/api/v1/ai-configuration')
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch AI configuration')
      }
      
      if (response.data) {
        setConfiguration(response.data)
        return response.data
      }
    } catch (error) {
      toast({
        title: "Failed to Load Configuration",
        description: error instanceof Error ? error.message : "Unable to load AI settings",
        variant: "destructive",
        duration: 5000
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const fetchSupportedModels = useCallback(async () => {
    try {
      const response = await apiClient.get<SupportedModels>('/chat/api/v1/ai-configuration/supported-models')
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch supported models')
      }
      
      if (response.data) {
        setSupportedModels(response.data)
        return response.data
      }
    } catch (error) {
      toast({
        title: "Failed to Load Models",
        description: "Unable to fetch supported AI models",
        variant: "destructive",
        duration: 5000
      })
      throw error
    }
  }, [toast])

  const updateConfiguration = useCallback(async (params: UpdateAIConfigurationParams) => {
    setIsSaving(true)
    
    try {
      const body: any = {
        provider: params.provider,
        modelName: params.modelName
      }
      
      if (params.apiKey?.trim()) {
        body.apiKey = params.apiKey
      }
      
      const response = await apiClient.post<AIConfiguration>('/chat/api/v1/ai-configuration', body)
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to save AI configuration')
      }
      
      toast({
        title: "Settings Saved",
        description: "AI configuration updated successfully",
        variant: "success",
        duration: 4000
      })
      
      const updatedConfig = await fetchConfiguration()
      return updatedConfig
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Unable to save AI settings",
        variant: "destructive",
        duration: 5000
      })
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [toast, fetchConfiguration])

  useEffect(() => {
    fetchConfiguration()
    fetchSupportedModels()
  }, [fetchConfiguration, fetchSupportedModels])

  return {
    configuration,
    supportedModels,
    isLoading,
    isSaving,
    fetchConfiguration,
    fetchSupportedModels,
    updateConfiguration
  }
}