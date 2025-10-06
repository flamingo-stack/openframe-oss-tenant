'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Button, Input } from '@flamingo/ui-kit/components/ui'
import { DetailPageContainer } from '@flamingo/ui-kit'
import { useToast } from '@flamingo/ui-kit/hooks'
import { useRouter } from 'next/navigation'
import { useRegistrationSecret } from '../hooks/use-registration-secret'
import { OS_PLATFORMS, DEFAULT_OS_PLATFORM, type OSPlatformId } from '@flamingo/ui-kit/utils'

type Platform = OSPlatformId

export default function NewDevicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [platform, setPlatform] = useState<Platform>(DEFAULT_OS_PLATFORM)
  const { initialKey } = useRegistrationSecret()
  const [argInput, setArgInput] = useState('')
  const [args, setArgs] = useState<string[]>([])

  const addArgument = useCallback(() => {
    const trimmed = argInput.trim()
    if (!trimmed) return
    setArgs((prev) => [...prev, trimmed])
    setArgInput('')
  }, [argInput])

  const removeArg = useCallback((idx: number) => {
    setArgs((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const onArgKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addArgument()
    }
  }, [addArgument])

  const command = useMemo(() => {
    const base = `sudo ./target/debug/openframe install --serverUrl localhost --initialKey ${initialKey} --localMode`
    const extras = args.length ? ' ' + args.join(' ') : ''
    return base + extras
  }, [initialKey, args])

  const copyCommand = useCallback(async () => {
    try {
      if (!initialKey) {
        toast({ title: 'Secret unavailable', description: 'Registration secret not loaded yet', variant: 'destructive' })
        return
      }
      await navigator.clipboard.writeText(command)
      toast({ title: 'Command copied', description: 'Installer command copied to clipboard', variant: 'default' })
    } catch (e) {
      toast({ title: 'Copy failed', description: 'Could not copy command', variant: 'destructive' })
    }
  }, [command, toast, initialKey])

  return (
    <AppLayout>
      <DetailPageContainer
        title="New Device"
        backButton={{ label: 'Back to Devices', onClick: () => router.push('/devices') }}
        padding='none'
        className='pt-6'
      >
        <div className="flex flex-col gap-6">
          {/* Top row: Organization and Platform */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Select Platform */}
            <div className="flex flex-col gap-2">
              <div className="text-ods-text-secondary text-sm">Select Platform</div>
              <div className="flex w-full bg-ods-card border border-ods-border rounded-[6px] p-1 gap-1">
                {OS_PLATFORMS.filter(p => p.id !== 'linux').map((p) => {
                  const Icon = p.icon
                  const selected = platform === p.id
                  return (
                    <Button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      variant="ghost"
                      className={(selected
                        ? 'bg-ods-accent-hover text-ods-text-on-accent '
                        : 'text-ods-text-secondary hover:text-ods-text-primary hover:bg-ods-bg-hover ') + 'flex-1 basis-0 justify-center px-4 py-2 rounded-[4px]'}
                      leftIcon={<Icon className="w-4 h-4" />}
                    >
                      {p.name}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Additional Arguments */}
          <div className="flex flex-col gap-2">
            <div className="text-ods-text-secondary text-sm">Additional Arguments</div>
            <Input
              className="w-full bg-ods-card border border-ods-border rounded-[6px] px-3 py-2 text-ods-text-primary"
              placeholder="Press enter after each argument"
              value={argInput}
              onChange={(e) => setArgInput(e.target.value)}
              onKeyDown={onArgKeyDown}
            />
            {args.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {args.map((a, idx) => (
                  <div
                    key={`${a}-${idx}`}
                    className="inline-flex items-center gap-2 bg-ods-card border border-ods-border rounded-[999px] px-3 py-1 text-ods-text-primary"
                  >
                    <span className="text-sm">{a}</span>
                    <button
                      onClick={() => removeArg(idx)}
                      className="text-ods-text-secondary hover:text-ods-text-primary text-sm"
                      aria-label="Remove argument"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Command box */}
          <div className="flex flex-col">
            <div
              className="w-full bg-ods-card border border-ods-border rounded-[6px] px-3 py-3 text-ods-text-primary font-mono text-[14px] select-none cursor-pointer"
              onClick={copyCommand}
            >
              {command}
            </div>
            <div className="text-ods-text-secondary text-sm mt-2">Click on the command to copy</div>
          </div>
        </div>
      </DetailPageContainer>
    </AppLayout>
  )
}


