'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@flamingo/ui-kit'
import { useToast } from '@flamingo/ui-kit/hooks'
import { MeshControlClient } from '../../../lib/meshcentral/meshcentral-control'
import { MeshTunnel, TunnelState } from '../../../lib/meshcentral/meshcentral-tunnel'
import { MeshDesktop } from '../../../lib/meshcentral/meshcentral-desktop'

interface RemoteDesktopModalProps {
  isOpen: boolean
  onClose: () => void
  deviceId: string
  deviceLabel?: string
}

export function RemoteDesktopModal({ isOpen, onClose, deviceId, deviceLabel }: RemoteDesktopModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const desktopRef = useRef<MeshDesktop | null>(null)
  const tunnelRef = useRef<MeshTunnel | null>(null)
  const [state, setState] = useState<TunnelState>(0)
  const [connecting, setConnecting] = useState(false)
  const [viewOnly, setViewOnly] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!isOpen) return
    const desktop = new MeshDesktop()
    desktopRef.current = desktop
    const canvas = canvasRef.current
    if (canvas) {
      // Initialize canvas size
      const resize = () => {
        const parent = canvas.parentElement
        if (parent) {
          const rect = parent.getBoundingClientRect()
          canvas.width = Math.max(1, Math.floor(rect.width))
          canvas.height = Math.max(1, Math.floor(rect.height))
        }
      }
      resize()
      window.addEventListener('resize', resize)
      desktop.attach(canvas)
      return () => {
        window.removeEventListener('resize', resize)
        desktop.detach()
      }
    }
  }, [isOpen])

  useEffect(() => {
    desktopRef.current?.setViewOnly(viewOnly)
  }, [viewOnly])

  useEffect(() => {
    if (!isOpen) return
    let control: MeshControlClient | undefined
    ;(async () => {
      setConnecting(true)
      try {
        control = new MeshControlClient()
        const { authCookie, relayCookie } = await control.getAuthCookies()
        const nodeId = `node//${deviceId}`
        const tunnel = new MeshTunnel({
          authCookie,
          nodeId: nodeId,
          protocol: 2,
          onData: () => {},
          onBinaryData: (bytes) => { desktopRef.current?.onBinaryFrame(bytes) },
          onCtrlMessage: () => {},
          onConsoleMessage: (msg) => { toast({ title: 'Remote Desktop', description: msg, variant: 'default' }) },
          onStateChange: (s) => setState(s)
        })
        tunnelRef.current = tunnel
        // Wire desktop input sender to the tunnel
        desktopRef.current?.setSender((data) => tunnel.sendBinary(data))
        try {
          await control.openSession()
          const relayId = tunnel.getRelayId()
          control.sendDesktopTunnel(nodeId, relayId, relayCookie)
        } catch {}
        tunnel.start()
      } catch (e) {
        toast({ title: 'Remote Desktop failed', description: (e as Error).message, variant: 'destructive' })
      } finally {
        setConnecting(false)
      }
    })()
    return () => { control?.close(); tunnelRef.current?.stop() }
  }, [isOpen, deviceId, toast])

  if (!isOpen) return null

  const statusText = state === 3 ? 'Connected' : state === 2 ? 'Open' : state === 1 ? 'Connecting' : 'Idle'

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 z-40 max-h-screen overflow-hidden">
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-ods-card flex flex-col p-4 gap-4 max-h-screen">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="font-['Azeret_Mono'] font-semibold text-[20px] text-ods-text-primary tracking-[-0.4px]">
              Remote Desktop {deviceLabel ? `- ${deviceLabel}` : ''}
            </h2>
            <div className="text-ods-text-secondary text-sm">{statusText}{connecting ? '…' : ''}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setViewOnly((v) => !v)}
              variant="outline"
              className="bg-ods-card border border-ods-border text-ods-text-primary"
            >
              {viewOnly ? 'Switch to Control' : 'Switch to View-only'}
            </Button>
            <Button
              onClick={() => tunnelRef.current?.stop()}
              variant="outline"
              className="bg-ods-card border border-ods-border text-ods-text-primary"
              disabled={state !== 3}
            >
              Disconnect
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="text-ods-text-secondary hover:text-white p-1"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-black rounded overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
      </div>
    </div>
  )
}


