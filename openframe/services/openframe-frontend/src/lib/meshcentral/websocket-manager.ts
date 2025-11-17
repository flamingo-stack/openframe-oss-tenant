import { apiClient } from '../api-client'

export type WebSocketState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'

export interface WebSocketManagerOptions {
  url: string | (() => string)
  maxReconnectAttempts?: number
  reconnectBackoff?: number[]
  onStateChange?: (state: WebSocketState) => void
  onMessage?: (event: MessageEvent) => void
  onError?: (event: Event) => void
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  shouldReconnect?: (closeEvent: CloseEvent) => boolean
  refreshTokenBeforeReconnect?: boolean
  protocols?: string | string[]
  binaryType?: BinaryType
  enableMessageQueue?: boolean
}

export class WebSocketManager {
  private socket: WebSocket | null = null
  private state: WebSocketState = 'disconnected'
  private reconnectAttempt = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private messageQueue: Array<string | ArrayBuffer | Blob> = []
  private isDisposed = false
  private lastConnectTime = 0
  private lastRefreshAttempt = 0
  private options: Required<Omit<WebSocketManagerOptions, 'protocols'>> & Pick<WebSocketManagerOptions, 'protocols'>

  constructor(options: WebSocketManagerOptions) {
    this.options = {
      maxReconnectAttempts: 5,
      reconnectBackoff: [1000, 2000, 4000, 8000, 16000, 30000],
      onStateChange: () => {},
      onMessage: () => {},
      onError: () => {},
      onOpen: () => {},
      onClose: () => {},
      shouldReconnect: (closeEvent) => {
        // Reconnect on abnormal closure or auth failure (1008, 1006, 4401)
        const authFailureCodes = [1008, 1006, 4401]
        return !closeEvent.wasClean || authFailureCodes.includes(closeEvent.code)
      },
      refreshTokenBeforeReconnect: true,
      binaryType: 'arraybuffer',
      enableMessageQueue: true,
      ...options
    }
  }

  private setState(newState: WebSocketState) {
    if (this.state !== newState) {
      this.state = newState
      this.options.onStateChange(newState)
    }
  }

  private async refreshTokenIfNeeded(forceRefresh: boolean = false): Promise<boolean> {
    if (!this.options.refreshTokenBeforeReconnect) return true

    try {
      // Throttle refresh checks to at most once every 30 seconds unless forced
      if (!forceRefresh) {
        const sinceLast = Date.now() - this.lastRefreshAttempt
        if (sinceLast < 30_000) {
          return true
        }
      }

      // If we recently connected successfully, token is likely still valid
      const timeSinceLastConnect = Date.now() - this.lastConnectTime
      if (!forceRefresh && timeSinceLastConnect < 2 * 60 * 1000) { // 2 minutes
        return true
      }

      this.lastRefreshAttempt = Date.now()
      const response = await apiClient.get('/api/me')
      
      if (response.ok) {
        return true
      } else {
        return false
      }
    } catch (error) {
      return false
    }
  }

  private getUrl(): string {
    const url = typeof this.options.url === 'function' ? this.options.url() : this.options.url
    return url
  }

  async connect(): Promise<void> {
    if (this.isDisposed
      || this.socket?.readyState === WebSocket.OPEN
      || this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    this.cleanup()
    this.setState('connecting')

    try {
      const url = this.getUrl()
      
      this.socket = new WebSocket(url, this.options.protocols)
      this.socket.binaryType = this.options.binaryType
      this.setupEventHandlers()
    } catch (error) {
      this.setState('failed')
      this.scheduleReconnect(false)
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.onopen = (event) => {
      this.setState('connected')
      this.reconnectAttempt = 0
      this.lastConnectTime = Date.now()
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
      
      this.flushMessageQueue()
      
      this.options.onOpen(event)
    }

    this.socket.onmessage = (event) => {
      this.options.onMessage(event)
    }

    this.socket.onerror = (event) => {
      this.options.onError(event)
    }

    this.socket.onclose = (event) => {
      this.setState('disconnected')
      
      this.options.onClose(event)
      
      if (!this.isDisposed && this.options.shouldReconnect(event)) {
        // Check for auth failure (1008 or specific close reasons)
        const isAuthFailure = event.code === 1008 || 
                             event.code === 1006 || 
                             event.reason?.toLowerCase().includes('auth') ||
                             event.reason?.toLowerCase().includes('unauthorized')
        
        this.scheduleReconnect(isAuthFailure)
      } else if (!this.isDisposed) {
        this.setState('failed')
      }
    }
  }

  private async scheduleReconnect(forceRefresh: boolean = false) {
    if (this.isDisposed || this.reconnectTimer) return

    if (this.reconnectAttempt >= this.options.maxReconnectAttempts) {
      this.setState('failed')
      return
    }

    const backoffIndex = Math.min(this.reconnectAttempt, this.options.reconnectBackoff.length - 1)
    const delay = this.options.reconnectBackoff[backoffIndex]
    
    this.setState('reconnecting')
    
    this.reconnectTimer = setTimeout(async () => {
      if (this.isDisposed) return
      
      this.reconnectAttempt++
      
      // If we somehow reconnected already, abort this scheduled attempt
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.setState('connected')
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
        return
      }

      const tokenRefreshed = await this.refreshTokenIfNeeded(forceRefresh)
      if (!tokenRefreshed && this.options.refreshTokenBeforeReconnect) {
        this.setState('failed')
        return
      }
      
      await this.connect()
    }, delay)
  }

  send(data: string | ArrayBuffer | Blob): boolean {
    if (this.socket?.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(data)
        return true
      } catch (error) {
        if (this.options.enableMessageQueue) {
          this.messageQueue.push(data)
        }
        return false
      }
    } else {
      if (this.options.enableMessageQueue) {
        this.messageQueue.push(data)
      }
      
      if (this.state === 'disconnected' || this.state === 'failed') {
        if (this.reconnectTimer || this.socket?.readyState === WebSocket.CONNECTING) {
          return false
        }
        this.reconnectAttempt = 0
        this.connect()
      }
      
      return false
    }
  }

  private flushMessageQueue() {
    if (this.messageQueue.length === 0) return
    
    while (this.messageQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()
      if (message !== undefined) {
        try {
          this.socket.send(message)
        } catch (error) {
          this.messageQueue.unshift(message)
          break
        }
      }
    }
  }

  reconnect() {
    this.reconnectAttempt = 0
    this.cleanup()
    this.connect()
  }

  disconnect() {
    this.isDisposed = true
    this.cleanup()
    this.setState('disconnected')
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.socket) {
      this.socket.onopen = null
      this.socket.onmessage = null
      this.socket.onerror = null
      this.socket.onclose = null
      
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        try {
          this.socket.close(1000, 'Normal closure')
        } catch (error) {
          console.error('Error closing socket:', error)
        }
      }
      
      this.socket = null
    }
  }

  getState(): WebSocketState {
    return this.state
  }

  getReadyState(): number {
    return this.socket?.readyState ?? WebSocket.CLOSED
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  dispose() {
    this.disconnect()
    this.messageQueue = []
  }
}