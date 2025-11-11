type ControlAuthCookies = { authCookie: string; relayCookie?: string }

import { buildWsUrl, MESH_USER, MESH_PASS } from './meshcentral-config'
import { runtimeEnv } from '../runtime-config'
import { WebSocketManager } from './websocket-manager'

export class MeshControlClient {
  private wsManager: WebSocketManager | null = null
  private isOpen = false
  private cookies: ControlAuthCookies | null = null
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: any }> = new Map()
  private activeTunnels: Array<{ nodeId: string; relayId: string; protocol: 1 | 2; domainPrefix?: string }> = []

  constructor(credentials?: { user: string; pass: string }, authCookie?: string) {
    const qs = new URLSearchParams({ 
      user: credentials?.user || MESH_USER, 
      pass: credentials?.pass || MESH_PASS 
    })
    if (authCookie) qs.append('auth', authCookie)
    
    const buildUrl = () => {
      let url = buildWsUrl(`/control.ashx?${qs.toString()}`)
      
      try {
        const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
        if (isDevTicketEnabled && typeof window !== 'undefined') {
          const token = localStorage.getItem('of_access_token')
          if (token) url += `&authorization=${encodeURIComponent(token)}`
        }
      } catch {}
      
      return url
    }

    this.wsManager = new WebSocketManager({
      url: buildUrl, // Use function to get fresh token on reconnect
      binaryType: 'arraybuffer',
      enableMessageQueue: true,
      maxReconnectAttempts: 10,
      reconnectBackoff: [1000, 2000, 4000, 8000, 16000, 30000],
      refreshTokenBeforeReconnect: true,
      
      onStateChange: (state) => {
        if (state === 'connected') {
          this.isOpen = true
          if (this.cookies) {
            this.cookies = null
            this.requestAuthCookies()
          }
        } else if (state === 'disconnected' || state === 'failed') {
          this.isOpen = false
          this.clearPendingRequests('WebSocket disconnected')
        }
      }, 
      onMessage: (e) => {
        this.handleMessage(e)
      }, 
      onError: () => {},
      shouldReconnect: (closeEvent) => {
        const authFailureCodes = [1008, 1006, 4401]
        return !closeEvent.wasClean || authFailureCodes.includes(closeEvent.code)
      }
    })
  }

  private handleMessage(e: MessageEvent) {
    try {
      const msg = JSON.parse(e.data as string)
      
      if (msg && msg.action === 'authcookie' && msg.cookie) {
        this.cookies = { authCookie: msg.cookie as string, relayCookie: msg.rcookie }
        
        try {
          this.wsManager?.send(JSON.stringify({ 
            action: 'urlargs', 
            args: { auth: this.cookies.authCookie } 
          }))
        } catch {}
        
        try {
          this.resendActiveTunnels()
        } catch {}
        
        const request = this.pendingRequests.get('authcookie')
        if (request) {
          clearTimeout(request.timeout)
          this.pendingRequests.delete('authcookie')
          request.resolve(this.cookies)
        }
      }
      
      if (msg && msg.action === 'poweraction' && msg.responseid) {
        const request = this.pendingRequests.get(msg.responseid)
        if (request) {
          clearTimeout(request.timeout)
          this.pendingRequests.delete(msg.responseid)
          
          if (msg.result === 'ok') {
            request.resolve()
          } else {
            request.reject(new Error(msg.result || 'Power action failed'))
          }
        }
      }
    } catch (error) {
      console.error('Error handling message:', error)
    }
  }

  private clearPendingRequests(reason: string) {
    for (const [, request] of this.pendingRequests) {
      clearTimeout(request.timeout)
      request.reject(new Error(reason))
    }
    this.pendingRequests.clear()
  }

  private async requestAuthCookies() {
    try {
      this.wsManager?.send(JSON.stringify({ action: 'authcookie' }))
    } catch (error) {
      console.error('Error requesting auth cookies:', error)
    }
  }

  async getAuthCookies(timeoutMs = 8000): Promise<ControlAuthCookies> {
    if (this.cookies) return this.cookies

    if (!this.isOpen) {
      await this.openSession()
    }

    return new Promise<ControlAuthCookies>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete('authcookie')
        reject(new Error('Timed out waiting for authcookie'))
      }, timeoutMs)

      this.pendingRequests.set('authcookie', { resolve, reject, timeout })
      this.requestAuthCookies()
    })
  }

  async openSession(): Promise<void> {
    if (!this.isOpen) {
      await this.wsManager?.connect()
      
      await new Promise<void>((resolve, reject) => {
        const checkConnection = () => {
          if (this.isOpen) {
            resolve()
          } else if (this.wsManager?.getState() === 'failed') {
            reject(new Error('Failed to establish control connection'))
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        checkConnection()
      })
    }
    
    await this.getAuthCookies()
  }

  sendTunnelMsg(nodeId: string, relayPathValue: string): void {
    if (!this.wsManager?.isConnected()) return
    
    const msg = { action: 'msg', type: 'tunnel', nodeid: nodeId, value: relayPathValue }
    try {
      this.wsManager.send(JSON.stringify(msg))
    } catch (error) {
      console.error('Error sending tunnel message:', error)
    }
  }

  sendRelayTunnel(nodeId: string, relayId: string, protocol: 1 | 2, relayCookie?: string, domainPrefix = ''): void {
    this.upsertActiveTunnel(nodeId, relayId, protocol, domainPrefix)

    const prefix = domainPrefix ? `${domainPrefix.replace(/^\/*|\/*$/g, '')}/` : ''
    const effectiveRelayCookie = this.cookies?.relayCookie ?? relayCookie
    const value = `*/${prefix}meshrelay.ashx?p=${protocol}&nodeid=${encodeURIComponent(nodeId)}&id=${encodeURIComponent(relayId)}${effectiveRelayCookie ? `&rauth=${encodeURIComponent(effectiveRelayCookie)}` : ''}`
    this.sendTunnelMsg(nodeId, value)
  }

  sendDesktopTunnel(nodeId: string, relayId: string, relayCookie?: string, domainPrefix = ''): void {
    this.sendRelayTunnel(nodeId, relayId, 2, relayCookie, domainPrefix)
  }

  private upsertActiveTunnel(nodeId: string, relayId: string, protocol: 1 | 2, domainPrefix?: string) {
    const existingIndex = this.activeTunnels.findIndex(t => t.relayId === relayId)
    if (existingIndex >= 0) {
      this.activeTunnels[existingIndex] = { nodeId, relayId, protocol, domainPrefix }
      return
    }
    this.activeTunnels.push({ nodeId, relayId, protocol, domainPrefix })
  }
  
  private resendActiveTunnels() {
    if (!this.isOpen || !this.wsManager?.isConnected()) return
    for (const t of this.activeTunnels) {
      this.sendRelayTunnel(t.nodeId, t.relayId, t.protocol, undefined, t.domainPrefix)
    }
  }

  async powerAction(nodeId: string, action: 'wake' | 'sleep' | 'reset' | 'poweroff', timeoutMs = 8000): Promise<void> {
    await this.openSession()
    
    if (!this.wsManager?.isConnected()) throw new Error('Control socket not open')
    
    const actionTypes: Record<typeof action, number> = {
      wake: 302,
      sleep: 4,
      reset: 3,
      poweroff: 2
    }
    const actiontype = actionTypes[action]
    const nodePath = nodeId.startsWith('node//') ? nodeId : `node//${nodeId}`
    const responseid = `power_${Date.now()}_${Math.random().toString(36).slice(2)}`

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(responseid)
        reject(new Error('Timed out waiting for poweraction response'))
      }, timeoutMs)

      this.pendingRequests.set(responseid, { resolve, reject, timeout })
      
      const payload = { action: 'poweraction', nodeids: [nodePath], actiontype, responseid }
      try {
        this.wsManager?.send(JSON.stringify(payload))
      } catch (error) {
        clearTimeout(timeout)
        this.pendingRequests.delete(responseid)
        reject(error)
      }
    })
  }

  close(): void {
    this.clearPendingRequests('Client closing')
    this.wsManager?.disconnect()
    this.wsManager = null
    this.isOpen = false
    this.cookies = null
  }
  
  async reconnect(): Promise<void> {
    this.cookies = null
    this.wsManager?.reconnect()
    await this.openSession()
  }
  
  isConnected(): boolean {
    return this.isOpen && this.wsManager?.isConnected() === true
  }
}