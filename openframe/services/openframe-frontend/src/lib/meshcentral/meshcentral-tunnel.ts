import { buildWsUrl } from './meshcentral-config'
import { runtimeEnv } from '../runtime-config'
import { WebSocketManager } from './websocket-manager'

export type TunnelState = 0 | 1 | 2 | 3 // 0: stopped, 1: connecting, 2: open, 3: connected

export type TunnelOptions = {
  cols?: number
  rows?: number
  requireLogin?: boolean
  // desktop-specific options can be added later (compression, etc.)
}

type TunnelCallbacks = {
  onData: (data: string | Uint8Array) => void
  onConsoleMessage?: (msg: string) => void
  onStateChange?: (state: TunnelState) => void
  onBinaryData?: (data: Uint8Array) => void
  onCtrlMessage?: (msg: any) => void
  onRequestPairing?: (relayId: string) => void
}

export class MeshTunnel {
  private wsManager?: WebSocketManager
  private state: TunnelState = 0
  private id: string
  private latencyTimer: any
  private isHandshakeComplete = false

  constructor(
    private params: {
      authCookie: string
      nodeId: string
      protocol?: number
      options?: TunnelOptions
    } & TunnelCallbacks
  ) {
    this.id = Math.random().toString(36).slice(2)
  }

  getRelayId(): string { return this.id }

  start() {
    const protocol = this.params.protocol ?? 1
    const qs = new URLSearchParams({
      browser: '1',
      p: String(protocol),
      nodeid: this.params.nodeId,
      id: this.id,
    })
    if (this.params.authCookie) qs.append('auth', this.params.authCookie)

    const buildUrl = () => {
      let url = buildWsUrl(`/meshrelay.ashx?${qs.toString()}`)
      
      try {
        const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
        if (isDevTicketEnabled && typeof window !== 'undefined') {
          const token = localStorage.getItem('of_access_token')
          if (token) url += `&authorization=${encodeURIComponent(token)}`
        }
      } catch {}
      
      return url
    }

    this.setState(1)
    this.isHandshakeComplete = false

    this.wsManager = new WebSocketManager({
      url: buildUrl,
      binaryType: 'arraybuffer',
      enableMessageQueue: true,
      maxReconnectAttempts: 10,
      reconnectBackoff: [1000, 2000, 4000, 8000, 16000, 30000],
      refreshTokenBeforeReconnect: true,
      
      onStateChange: (wsState) => {
        // Map WebSocketManager states to TunnelState
        if (wsState === 'connecting' || wsState === 'reconnecting') {
          this.setState(1)
          this.isHandshakeComplete = false
        } else if (wsState === 'connected') {
          this.setState(2)
          // Ask caller to re-send pairing via control connection on reconnect
          try { 
            this.params.onRequestPairing?.(this.id)
          } catch (e) {
            console.error('[MeshTunnel] Error calling onRequestPairing:', e)
          }
          this.initializeHandshake()
        } else if (wsState === 'disconnected' || wsState === 'failed') {
          this.setState(0)
          this.clearLatencyTimer()
        }
      },
      onOpen: () => {},
      onMessage: (e) => this.onMessage(e),
      onError: () => {},
      onClose: () => {
        this.clearLatencyTimer()
      },
      shouldReconnect: (closeEvent) => {
        // Reconnect on auth failures and abnormal closures
        const authFailureCodes = [1008, 1006, 4401]
        const shouldReconnect = !closeEvent.wasClean || authFailureCodes.includes(closeEvent.code)
        
        return shouldReconnect
      }
    })

    this.wsManager.connect()
  }

  private initializeHandshake() {
    this.sendCtrl({ ctrlChannel: 102938, type: 'rtt', time: Date.now() })
    this.clearLatencyTimer()
    this.latencyTimer = setInterval(() => {
      this.sendCtrl({ ctrlChannel: 102938, type: 'rtt', time: Date.now() })
    }, 10000)
  }

  private clearLatencyTimer() {
    if (this.latencyTimer) {
      clearInterval(this.latencyTimer)
      this.latencyTimer = null
    }
  }

  stop() {
    this.clearLatencyTimer()
    
    try {
      if (this.wsManager?.isConnected()) {
        this.sendCtrl({ ctrlChannel: 102938, type: 'close' })
      }
    } catch {}
    
    this.wsManager?.disconnect()
    this.wsManager = undefined
    this.setState(0)
    this.isHandshakeComplete = false
  }

  private onMessage(e: MessageEvent) {
    if (!this.isHandshakeComplete) {
      const data = e.data
      if (data === 'c' || data === 'cr') {
        console.log('[MeshTunnel] Handshake received, sending protocol:', this.params.protocol)
        const options = this.params.options
        if (options && (options.cols || options.rows || options.requireLogin)) {
          this.sendCtrl({ ...options, type: 'options', ctrlChannel: 102938 })
        }
        this.sendRaw(String(this.params.protocol ?? 1))
        this.setState(3)
        this.isHandshakeComplete = true
        return
      }
      // During handshake, ignore other messages
      return
    }
    
    if (typeof e.data === 'string') {
      const s = e.data as string
      
      // Ignore empty messages
      if (s.length === 0) {
        return
      }
      
      if (s[0] === '~') {
        this.params.onData(s.substring(1))
        return
      }
      try {
        const j = JSON.parse(s)
        if (j && (j.ctrlChannel === 102938 || j.ctrlChannel === '102938')) {
          if (j.type === 'console' && this.params.onConsoleMessage) {
            this.params.onConsoleMessage(j.msg)
          }
          if (j.type === 'ping') {
            this.sendCtrl({ ctrlChannel: 102938, type: 'pong' })
          }
          if (this.params.onCtrlMessage) {
            this.params.onCtrlMessage(j)
          }
          return
        }
      } catch {}
      
      // Pass non-empty string data to the handler
      this.params.onData(s)
    } else {
      const buf = new Uint8Array(e.data as ArrayBuffer)
      if (this.params.onBinaryData) {
        this.params.onBinaryData(buf)
      } else {
        this.params.onData(buf)
      }
    }
  }

  sendText(text: string) {
    // Send as text frame, not binary
    this.sendRaw(text)
  }

  sendCtrl(obj: any) {
    try {
      const data = JSON.stringify(obj)
      this.wsManager?.send(data)
    } catch (error) {
      console.error('[MeshTunnel] Error sending control message:', error)
    }
  }

  private sendRaw(x: string | Uint8Array) {
    try {
      if (!this.wsManager?.isConnected()) {
        return
      }
      
      if (typeof x === 'string') {
        // Send string as text frame (opcode=1)
        this.wsManager.send(x)
      } else {
        // Send binary as binary frame (opcode=2)
        this.wsManager.send(x.buffer as ArrayBuffer)
      }
    } catch (error) {
      console.error('[MeshTunnel] Error sending raw data:', error)
    }
  }

  sendBinary(x: Uint8Array) {
    this.sendRaw(x)
  }

  private setState(s: TunnelState) {
    if (this.state === s) return
    this.state = s
    this.params.onStateChange?.(s)
  }
  
  reconnect() {
    this.isHandshakeComplete = false
    this.wsManager?.reconnect()
  }
  
  getState(): TunnelState {
    return this.state
  }
  
  isConnected(): boolean {
    return this.state === 3
  }
}