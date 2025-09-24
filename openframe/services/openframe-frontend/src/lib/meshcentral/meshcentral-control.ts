type ControlAuthCookies = { authCookie: string; relayCookie?: string }

import { buildWsUrl, MESH_USER, MESH_PASS } from './meshcentral-config'

export class MeshControlClient {
  private socket: WebSocket | null = null
  private url: string
  private isOpen = false
  private openPromise: Promise<void> | null = null
  private cookies: ControlAuthCookies | null = null

  constructor(private credentials?: { user: string; pass: string }, private authCookie?: string) {
    const qs = new URLSearchParams({ user: credentials?.user || MESH_USER, pass: credentials?.pass || MESH_PASS })
    if (authCookie) qs.append('auth', authCookie)
    this.url = buildWsUrl(`/control.ashx?${qs.toString()}`)
  }

  async getAuthCookies(timeoutMs = 8000): Promise<ControlAuthCookies> {
    if (this.cookies) return this.cookies
    // If socket is already open, request cookies on the same connection
    if (this.socket && this.isOpen) {
      return new Promise<ControlAuthCookies>((resolve, reject) => {
        let timeout: any
        const handler = (e: MessageEvent) => {
          try {
            const msg = JSON.parse(e.data as string)
            if (msg && msg.action === 'authcookie' && msg.cookie) {
              clearTimeout(timeout)
              this.cookies = { authCookie: msg.cookie as string, relayCookie: msg.rcookie }
              try { this.socket?.send(JSON.stringify({ action: 'urlargs', args: { auth: this.cookies.authCookie } })) } catch {}
              this.socket?.removeEventListener('message', handler as any)
              resolve(this.cookies)
            }
          } catch {}
        }
        try {
          this.socket?.addEventListener('message', handler as any)
          this.socket?.send(JSON.stringify({ action: 'authcookie' }))
          timeout = setTimeout(() => {
            this.socket?.removeEventListener('message', handler as any)
            reject(new Error('Timed out waiting for authcookie'))
          }, timeoutMs)
        } catch (e) {
          this.socket?.removeEventListener('message', handler as any)
          reject(e as Error)
        }
      })
    }
    // Open a new socket and keep it open for both auth and tunnel pairing
    return new Promise<ControlAuthCookies>((resolve, reject) => {
      let timeout: any
      try {
        this.socket = new WebSocket(this.url)
        this.socket.onopen = () => {
          this.isOpen = true
          try { this.socket?.send(JSON.stringify({ action: 'authcookie' })) } catch {}
          timeout = setTimeout(() => {
            reject(new Error('Timed out waiting for authcookie'))
          }, timeoutMs)
        }
        this.socket.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data as string)
            if (msg && msg.action === 'authcookie' && msg.cookie) {
              clearTimeout(timeout)
              this.cookies = { authCookie: msg.cookie as string, relayCookie: msg.rcookie }
              try { this.socket?.send(JSON.stringify({ action: 'urlargs', args: { auth: this.cookies.authCookie } })) } catch {}
              resolve(this.cookies)
            }
          } catch {}
        }
        this.socket.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('Control socket error'))
          this.cleanup()
        }
        this.socket.onclose = () => {
          clearTimeout(timeout)
          this.cleanup()
        }
      } catch (e) {
        clearTimeout(timeout)
        reject(e as Error)
        this.cleanup()
      }
    })
  }

  async openSession(): Promise<void> {
    // Ensure a single open connection with cookies attached
    await this.getAuthCookies()
  }

  sendTunnelMsg(nodeId: string, relayPathValue: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    const msg = { action: 'msg', type: 'tunnel', nodeid: nodeId, value: relayPathValue }
    try { this.socket.send(JSON.stringify(msg)) } catch {}
  }

  sendDesktopTunnel(nodeId: string, relayId: string, relayCookie?: string, domainPrefix = ''): void {
    const prefix = domainPrefix ? `${domainPrefix.replace(/^\/*|\/*$/g, '')}/` : ''
    const value = `*/${prefix}meshrelay.ashx?p=2&nodeid=${encodeURIComponent(nodeId)}&id=${encodeURIComponent(relayId)}${relayCookie ? `&rauth=${encodeURIComponent(relayCookie)}` : ''}`
    this.sendTunnelMsg(nodeId, value)
  }

  close() { this.cleanup() }

  private cleanup() {
    try { this.socket?.close() } catch {}
    this.socket = null
    this.isOpen = false
    this.openPromise = null
  }
}


