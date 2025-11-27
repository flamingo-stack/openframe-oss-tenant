'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

// Force dynamic rendering for this page due to useSearchParams in AppLayout
export const dynamic = 'force-dynamic'
import { AppLayout } from '../../components/app-layout'
import { Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, StatusBadge } from '@flamingo/ui-kit/components/ui'
import { DetailPageContainer } from '@flamingo/ui-kit'
import { OSTypeBadge } from '@flamingo/ui-kit/components/features'
import { useToast } from '@flamingo/ui-kit/hooks'
import { useRouter } from 'next/navigation'
import { useRegistrationSecret } from '../hooks/use-registration-secret'
import { DEFAULT_OS_PLATFORM, type OSPlatformId } from '@flamingo/ui-kit/utils'
import { OS_TYPES } from '@flamingo/ui-kit/types'
import { useOrganizationsMin } from '../../organizations/hooks/use-organizations-min'

type Platform = OSPlatformId

const MACOS_BINARY_URL = 'https://github.com/flamingo-stack/openframe-oss-tenant/releases/latest/download/openframe-client_macos.tar.gz'
const WINDOWS_BINARY_URL = 'https://github.com/flamingo-stack/openframe-oss-tenant/releases/latest/download/openframe-client_windows.zip'

export default function NewDevicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [platform, setPlatform] = useState<Platform>(DEFAULT_OS_PLATFORM)
  const { initialKey } = useRegistrationSecret()
  const [argInput, setArgInput] = useState('')
  const [args, setArgs] = useState<string[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const { items: orgs, fetch: fetchOrgs } = useOrganizationsMin()

  const serverUrl = useMemo(() => {
    if (typeof window === 'undefined')
      return 'localhost'
    const { protocol, hostname } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'localhost --localMode'
    }
    return hostname
  }, [])

  useEffect(() => {
    fetchOrgs('').catch(() => { })
  }, [fetchOrgs])

  // Auto-select first or "Default" organization when orgs load
  useEffect(() => {
    if (orgs.length > 0 && !selectedOrgId) {
      // Try to find "Default" organization first
      const defaultOrg = orgs.find(o => o.isDefault)
      const orgToSelect = defaultOrg || orgs[0]

      if (orgToSelect) {
        setSelectedOrgId(orgToSelect.organizationId)
      }
    }
  }, [orgs, selectedOrgId])

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
    const orgIdArg = selectedOrgId
    const baseArgs = `install --serverUrl ${serverUrl} --initialKey ${initialKey} --orgId ${orgIdArg}`
    const extras = args.length ? ' ' + args.join(' ') : ''

    if (platform === 'windows') {
      const argString = `${baseArgs}${extras}`
      return `Remove-Item -Path 'openframe-client.zip','openframe-client.exe' -Force -ErrorAction SilentlyContinue; Invoke-WebRequest -Uri '${WINDOWS_BINARY_URL}' -OutFile 'openframe-client.zip'; Expand-Archive -Path 'openframe-client.zip' -DestinationPath '.' -Force; Start-Process -FilePath '.\\openframe-client.exe' -ArgumentList '${argString}' -Verb RunAs -Wait`
    }

    return `rm -f openframe-client_macos.tar.gz openframe-client 2>/dev/null; curl -L -o openframe-client_macos.tar.gz '${MACOS_BINARY_URL}' && tar -xzf openframe-client_macos.tar.gz && sudo chmod +x ./openframe-client && sudo ./openframe-client ${baseArgs}${extras}`
  }, [initialKey, args, platform, selectedOrgId, serverUrl])

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
            {/* Select Organization */}
            <div className="flex flex-col gap-2">
              <div className="text-ods-text-secondary text-sm">Select Organization</div>
              <Select value={selectedOrgId} onValueChange={(v) => setSelectedOrgId(v)}>
                <SelectTrigger className="bg-ods-card border border-ods-border">
                  <SelectValue placeholder="Choose organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.organizationId}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Select Platform */}
            <div className="flex flex-col gap-2">
              <div className="text-ods-text-secondary text-sm">Select Platform</div>
              <div className="flex w-full gap-2">
                {OS_TYPES.map((os) => {
                  const selected = platform === os.platformId
                  const isDisabled = os.platformId === 'linux'
                  const label = isDisabled ? <StatusBadge
                    text="Coming Soon"
                    variant="button"
                    colorScheme="cyan"
                  /> : undefined;
                  return (
                    <div
                      key={os.id}
                      onClick={() => !isDisabled && setPlatform(os.platformId)}
                      className="flex-1 relative"
                    >
                      <OSTypeBadge
                        osType={os.value}
                        iconSize="w-5 h-5"
                        rigntIcon={label}
                        variant='ghost'
                        alignment='center'
                        className={(isDisabled
                          ? 'bg-ods-card text-ods-text-secondary opacity-50 cursor-not-allowed border-ods-border '
                          : selected
                            ? 'bg-ods-accent text-ods-text-on-accent hover:bg-ods-accent-hover border-ods-accent cursor-pointer '
                            : 'bg-ods-card text-ods-text-secondary hover:text-ods-text-primary hover:bg-ods-bg-hover border-ods-border cursor-pointer ') + '!w-full sm:!w-full min-h-[60px] items-center justify-center rounded-lg border p-2 text-[14px] md:text-[18px] font-medium transition-colors pointer-events-auto'}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Additional Arguments - Hidden but not deleted */}
          <div className="hidden flex-col gap-2">
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
              className="w-full bg-ods-card border border-ods-border rounded-[6px] px-4 py-4 text-ods-text-primary font-mono text-[16px] md:text-[18px] select-none cursor-pointer leading-relaxed"
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


