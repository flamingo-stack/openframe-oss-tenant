import { buildWsUrl } from './meshcentral-config'

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
}

export class MeshTunnel {
  private socket?: WebSocket
  private state: TunnelState = 0
  private id: string
  private latencyTimer: any

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
    const url = buildWsUrl(`/meshrelay.ashx?${qs.toString()}`)

    this.setState(1)
    this.socket = new WebSocket(url)
    this.socket.binaryType = 'arraybuffer'
    this.socket.onopen = () => {
      this.setState(2)
      this.sendCtrl({ ctrlChannel: 102938, type: 'rtt', time: Date.now() })
      this.latencyTimer = setInterval(() => this.sendCtrl({ ctrlChannel: 102938, type: 'rtt', time: Date.now() }), 10000)
    }
    this.socket.onmessage = (e) => this.onMessage(e)
    this.socket.onclose = () => this.stop()
    this.socket.onerror = () => this.stop()
  }

  stop() {
    if (this.latencyTimer) { clearInterval(this.latencyTimer); this.latencyTimer = null }
    try { if (this.socket?.readyState === WebSocket.OPEN) this.sendCtrl({ ctrlChannel: 102938, type: 'close' }) } catch {}
    try { this.socket?.close() } catch {}
    this.socket = undefined
    this.setState(0)
  }

  private onMessage(e: MessageEvent) {
    if (this.state < 3) {
      const data = e.data
      if (data === 'c' || data === 'cr') {
        const options = this.params.options
        if (options && (options.cols || options.rows || options.requireLogin)) {
          this.sendCtrl({ ...options, type: 'options', ctrlChannel: 102938 })
        }
        this.sendRaw(String(this.params.protocol ?? 1))
        this.setState(3)
        return
      }
    }
    if (typeof e.data === 'string') {
      const s = e.data as string
      if (s[0] === '~') {
        this.params.onData(s.substring(1))
        return
      }
      try {
        const j = JSON.parse(s)
        if (j && j.ctrlChannel === 102938) {
          if (j.type === 'console' && this.params.onConsoleMessage) this.params.onConsoleMessage(j.msg)
          if (j.type === 'ping') this.sendCtrl({ ctrlChannel: 102938, type: 'pong' })
          if (this.params.onCtrlMessage) this.params.onCtrlMessage(j)
          return
        }
      } catch {}
    } else {
      const buf = new Uint8Array(e.data as ArrayBuffer)
      if (this.params.onBinaryData) this.params.onBinaryData(buf)
      else this.params.onData(buf)
    }
  }

  sendText(text: string) {
    const enc = new TextEncoder()
    this.sendRaw(enc.encode(text))
  }

  sendCtrl(obj: any) {
    try { this.socket?.send(JSON.stringify(obj)) } catch {}
  }

  private sendRaw(x: string | Uint8Array) {
    try {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
      if (typeof x === 'string') {
        const b = new Uint8Array(x.length)
        for (let i = 0; i < x.length; i++) b[i] = x.charCodeAt(i)
        this.socket.send(b.buffer)
      } else {
        this.socket.send(x)
      }
    } catch {}
  }

  sendBinary(x: Uint8Array) {
    this.sendRaw(x)
  }

  private setState(s: TunnelState) {
    if (this.state === s) return
    this.state = s
    this.params.onStateChange?.(s)
  }
}


