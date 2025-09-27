'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@flamingo/ui-kit'
import { useToast } from '@flamingo/ui-kit/hooks'
import { X } from 'lucide-react'
import { Alert, AlertDescription } from '@flamingo/ui-kit/components/ui'
import { AlertTriangleIcon } from '@flamingo/ui-kit/components/icons'

interface ApiKeyCreatedModalProps {
  isOpen: boolean
  fullKey: string | null
  onClose: () => void
}

export function ApiKeyCreatedModal({ isOpen, fullKey, onClose }: ApiKeyCreatedModalProps) {
  const { toast } = useToast()
  const [localKey, setLocalKey] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setLocalKey('')
    } else if (fullKey) {
      setLocalKey(fullKey)
    }
  }, [isOpen, fullKey])

  if (!isOpen || !localKey) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localKey)
      toast({ title: 'Copied', description: 'API key copied to clipboard', variant: 'success' })
    } catch {
      toast({ title: 'Copy failed', description: 'Unable to copy API key', variant: 'destructive' })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full max-w-[840px] flex flex-col p-10 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-['Azeret_Mono'] font-semibold text-[32px] tracking-[-0.8px] text-ods-text-primary">API Key Created</h2>
          <Button onClick={onClose} variant="ghost" className="text-ods-text-secondary hover:text-white p-1">
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Warning banner */}
        <Alert className="bg-ods-warning border-ods-warning text-ods-text-on-accent rounded-[6px] [&>svg]:top-1/2 [&>svg]:-translate-y-1/2">
          <AlertTriangleIcon className="h-6 w-6" />
          <AlertDescription className="font-['DM_Sans'] text-[18px]">
            This is the only time you’ll see the complete API key. Please copy it and store it securely.
          </AlertDescription>
        </Alert>

        {/* Key display */}
        <div className="bg-ods-bg border border-ods-border rounded-[6px] p-4">
          <code className="block font-['Azeret_Mono'] text-[16px] text-ods-text-primary break-all">{localKey}</code>
        </div>

        {/* Footer */}
        <div className="flex gap-6 pt-2">
          <Button onClick={handleCopy} className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface transition-colors">
            Copy API Key
          </Button>
          <Button onClick={onClose} className="flex-1 bg-ods-accent text-text-on-accent font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-accent-hover transition-colors">
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}


