import { tokenService } from './tokenService'

export interface SupportedModel {
  modelName: string
  displayName: string
  provider: string
  contextWindow: number
}

export interface SupportedModelsResponse {
  anthropic: SupportedModel[]
  openai: SupportedModel[]
  'google-gemini': SupportedModel[]
}

class SupportedModelsService {
  private models: Map<string, SupportedModel> = new Map()
  private isLoaded = false
  private loadPromise: Promise<void> | null = null

  async loadSupportedModels(): Promise<void> {
    if (this.isLoaded) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = this.fetchModels()
    return this.loadPromise
  }

  private async fetchModels(): Promise<void> {
    try {
      const apiBaseUrl = tokenService.getCurrentApiBaseUrl()
      const token = tokenService.getCurrentToken()
      
      if (!apiBaseUrl || !token) {
        return
      }

      const response = await fetch(`${apiBaseUrl}/chat/api/v1/ai-configuration/supported-models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.warn('[SupportedModelsService] Failed to fetch supported models:', response.status)
        return
      }

      const data: SupportedModelsResponse = await response.json()
      
      this.models.clear()

      Object.values(data).forEach(providerModels => {
        providerModels.forEach(model => {
          this.models.set(model.modelName, model)
        })
      })

      this.isLoaded = true
    } catch (error) {
      console.error('[SupportedModelsService] Error fetching supported models:', error)
    } finally {
      this.loadPromise = null
    }
  }

  getModelDisplayName(modelName: string): string {
    const model = this.models.get(modelName)
    return model?.displayName || modelName
  }

  getModel(modelName: string): SupportedModel | undefined {
    return this.models.get(modelName)
  }

  getAllModels(): SupportedModel[] {
    return Array.from(this.models.values())
  }

  isModelSupported(modelName: string): boolean {
    return this.models.has(modelName)
  }

  reset(): void {
    this.models.clear()
    this.isLoaded = false
    this.loadPromise = null
  }
}

export const supportedModelsService = new SupportedModelsService()