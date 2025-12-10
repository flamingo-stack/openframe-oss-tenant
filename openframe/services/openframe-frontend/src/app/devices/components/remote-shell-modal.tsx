'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@flamingo/ui-kit'
import { useToast } from '@flamingo/ui-kit/hooks'
import { MeshControlClient } from '@lib/meshcentral/meshcentral-control'
import { MeshTunnel, TunnelState } from '@lib/meshcentral/meshcentral-tunnel'

const WINDOWS_POWERSHELL_CMD = 'powershell -NoLogo -NoProfile 2>nul || "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoLogo -NoProfile 2>nul || "%SystemRoot%\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe" -NoLogo -NoProfile 2>nul || "%ProgramFiles%\\PowerShell\\7\\pwsh.exe" -NoLogo -NoProfile 2>nul || "%ProgramFiles(x86)%\\PowerShell\\7\\pwsh.exe" -NoLogo -NoProfile 2>nul'

interface RemoteShellModalProps {
  isOpen: boolean
  onClose: () => void
  deviceId: string
  deviceLabel?: string
  shellType?: 'cmd' | 'powershell'
}

export function RemoteShellModal({ isOpen, onClose, deviceId, deviceLabel, shellType = 'cmd' }: RemoteShellModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<any | null>(null)
  const fitRef = useRef<any | null>(null)
  const tunnelRef = useRef<MeshTunnel | null>(null)
  const [state, setState] = useState<TunnelState>(0)
  const [connecting, setConnecting] = useState(false)
  const [hasReceivedData, setHasReceivedData] = useState(false)
  const powershellCommandSentRef = useRef(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!isOpen) return

    let isDisposed = false

    ;(async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('xterm'),
        import('xterm-addon-fit')
      ])

      if (isDisposed) return

      const term = new Terminal({
        fontFamily: 'monospace',
        theme: { background: '#000000' },
        cursorBlink: true
      })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.open(containerRef.current!)
      fit.fit()
      term.focus()
      termRef.current = term
      fitRef.current = fit

      const handleResize = () => {
        try { fit.fit() } catch {}
        if (tunnelRef.current && termRef.current) {
          tunnelRef.current.sendCtrl({ ctrlChannel: 102938, type: 'termsize', cols: term.cols, rows: term.rows })
        }
      }
      window.addEventListener('resize', handleResize)
      const disposeResize = term.onResize(() => handleResize)
      const disposeData = term.onData((d: string) => tunnelRef.current?.sendBinary(new TextEncoder().encode(d)))

      const cleanup = () => {
        window.removeEventListener('resize', handleResize)
        disposeResize.dispose()
        disposeData.dispose()
        tunnelRef.current?.stop()
        term.dispose()
        termRef.current = null
        fitRef.current = null
      }

      ;(cleanup as any).assigned = true
      ;(termRef as any).cleanup = cleanup
    })()

    return () => {
      isDisposed = true
      const assignedCleanup = (termRef as any).cleanup as (() => void) | undefined
      if (assignedCleanup) assignedCleanup()
    }
  }, [isOpen])

  useEffect(() => {
    if (state === 3 && shellType === 'powershell' && hasReceivedData && !powershellCommandSentRef.current && tunnelRef.current) {
      setTimeout(() => {
        if (tunnelRef.current && !powershellCommandSentRef.current) {
          tunnelRef.current.sendBinary(new TextEncoder().encode(WINDOWS_POWERSHELL_CMD + '\r'))
          powershellCommandSentRef.current = true
        }
      }, 100)
    }
  }, [state, shellType, hasReceivedData])

  useEffect(() => {
    if (!isOpen) {
      powershellCommandSentRef.current = false
      setHasReceivedData(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    let control: MeshControlClient | undefined
    ;(async () => {
      setConnecting(true)
      try {
        control = new MeshControlClient()
        const { authCookie } = await control.getAuthCookies()
        const term = termRef.current
        if (!term) throw new Error('Terminal not initialized')
        const tunnel = new MeshTunnel({
          authCookie,
          nodeId: deviceId,
          protocol: 1,
          options: { cols: term.cols, rows: term.rows },
          onData: (data) => {
            setHasReceivedData(true)
            if (typeof data === 'string') term.write(data)
            else term.write(new TextDecoder().decode(data))
          },
          onCtrlMessage: () => {},
          onConsoleMessage: (msg) => {
            toast({ title: 'Remote Shell', description: msg, variant: 'default' })
          },
          onRequestPairing: async (relayId) => {
            try {
              if (!control) return
              await control.openSession()
              control.sendRelayTunnel(deviceId, relayId, 1)
            } catch {}
          },
          onStateChange: (s) => setState(s)
        })
        tunnelRef.current = tunnel
        try {
          await control.openSession()
        } catch {}
        tunnel.start()
      } catch (e) {
        toast({ title: 'Remote Shell failed', description: (e as Error).message, variant: 'destructive' })
      } finally {
        setConnecting(false)
      }
    })()
    return () => { control?.close() }
  }, [isOpen, deviceId, toast])

  if (!isOpen) return null

  const statusText = state === 3 ? 'Connected' : state === 2 ? 'Open' : state === 1 ? 'Connecting' : 'Idle'

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 z-40 max-h-[90vh] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-ods-card flex flex-col p-4 gap-4 max-h-[90vh]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="font-['Azeret_Mono'] font-semibold text-[20px] text-ods-text-primary tracking-[-0.4px]">
              Remote Shell {shellType === 'powershell' ? '(PowerShell)' : ''} {deviceLabel ? `- ${deviceLabel}` : ''}
            </h2>
            <div className="text-ods-text-secondary text-sm">{statusText}{connecting ? '…' : ''}</div>
          </div>
          <div className="flex items-center gap-2">
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
          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  )
}


