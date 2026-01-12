import { tokenService } from './tokenService'

type CreateDialogResponse = {
  id?: string
  dialogId?: string
}

export class ChatApiService {
  private dialogId: string | null = null
  private debugMode: boolean
  private tokenUnsubscribe?: () => void
  private apiUrlUnsubscribe?: () => void
  private dialogIdListeners: Set<(dialogId: string | null) => void> = new Set()

  constructor(debug: boolean = false) {
    this.debugMode = debug

    this.tokenUnsubscribe = tokenService.onTokenUpdate(() => {
      if (this.debugMode) {
        console.log('[ChatApiService] Token updated via listener')
      }
    })
    
    this.apiUrlUnsubscribe = tokenService.onApiUrlUpdate((apiUrl) => {
      if (this.debugMode) {
        console.log('[ChatApiService] API URL updated:', apiUrl)
      }
    })
  }
  
  onDialogIdUpdate(callback: (dialogId: string | null) => void): () => void {
    this.dialogIdListeners.add(callback)
    try {
      callback(this.dialogId)
    } catch {
      // ignore callback errors
    }
    return () => {
      this.dialogIdListeners.delete(callback)
    }
  }

  private setDialogId(dialogId: string | null) {
    if (this.dialogId === dialogId) return
    this.dialogId = dialogId
    for (const listener of this.dialogIdListeners) {
      try {
        listener(dialogId)
      } catch {
        // ignore listener failures
      }
    }
  }

  private getApiBaseUrl(): string {
    return tokenService.getCurrentApiBaseUrl() || ''
  }

  private getHeaders(): HeadersInit {
    const token = tokenService.getCurrentToken()

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
  
  private async ensureTokenReady(): Promise<void> {
    let token = tokenService.getCurrentToken()
    
    if (!token) {
      if (this.debugMode) {
        console.log('[ChatApiService] Token not ready, requesting...')
      }
      token = await tokenService.requestToken()
      
      if (!token) {
        throw new Error('Authentication token not available.')
      }
    }
    
    let apiUrl = tokenService.getCurrentApiBaseUrl()
    if (!apiUrl) {
      if (this.debugMode) {
        console.log('[ChatApiService] API URL not ready, initializing...')
      }
      await tokenService.initApiUrl()
      apiUrl = tokenService.getCurrentApiBaseUrl()
      
      if (!apiUrl) {
        throw new Error('API server URL not configured.')
      }
    }
  }

  async createDialog(): Promise<string> {
    await this.ensureTokenReady()

    const url = `${this.getApiBaseUrl()}/chat/api/v2/dialogs`
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({}),
    }).catch((err) => {
      if (this.debugMode) {
        throw new Error(`Network error creating dialog: ${err.message}\nURL: ${url}`)
      }
      throw err
    })

    if (!response.ok) {
      const errorText = (await response.json().catch(() => response.statusText))?.message;
      throw new Error(`Failed to create dialog: ${errorText}`)
    }

    const parsed = (await response.json().catch(() => ({}))) as CreateDialogResponse
    const id = parsed?.id || parsed?.dialogId
    if (!id) {
      throw new Error('Failed to create dialog: response did not include "id"')
    }

    this.setDialogId(id)
    return id
  }

  async sendMessage(args: { dialogId: string; content: string; chatType: 'CLIENT_CHAT' }): Promise<void> {
    await this.ensureTokenReady()

    const url = `${this.getApiBaseUrl()}/chat/api/v2/messages`
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(args),
    }).catch((err) => {
      if (this.debugMode) {
        throw new Error(`Network error sending message: ${err.message}\nURL: ${url}\nDialog ID: ${args.dialogId}`)
      }
      throw err
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}\n${errorText}`)
    }
  }
  
  setDebugMode(enabled: boolean) {
    this.debugMode = enabled
  }

  reset() {
    this.setDialogId(null)
  }
  
  getDialogId(): string | null {
    return this.dialogId
  }

  destroy() {
    if (this.tokenUnsubscribe) {
      this.tokenUnsubscribe()
    }
    if (this.apiUrlUnsubscribe) {
      this.apiUrlUnsubscribe()
    }
  }
}