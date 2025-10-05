'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@flamingo/ui-kit'
import { X } from 'lucide-react'

interface RegenerateApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  apiKeyName?: string
  onConfirm: () => Promise<void>
}

export function RegenerateApiKeyModal({ isOpen, onClose, apiKeyName, onConfirm }: RegenerateApiKeyModalProps) {
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (!isOpen) setLoading(false) }, [isOpen])
  if (!isOpen) return null

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full max-w-[840px] flex flex-col p-10 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-['Azeret_Mono'] font-semibold text-[32px] tracking-[-0.8px] text-ods-text-primary">Confirm Regeneration</h2>
          <Button onClick={onClose} variant="ghost" className="text-ods-text-secondary hover:text-white p-1">
            <X className="h-6 w-6" />
          </Button>
        </div>

        <p className="font-['DM_Sans'] text-[22px] text-ods-text-primary">
          Are you sure you want to regenerate <span className="text-ods-warning font-semibold">{apiKeyName || 'this API Key'}</span>? The current key will stop working immediately.
        </p>

        <div className="flex gap-6 pt-2">
          <Button onClick={onClose} className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface transition-colors">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading} className="flex-1 bg-ods-accent text-text-on-accent font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ods-accent-hover transition-colors">
            Regenerate API Key
          </Button>
        </div>
      </div>
    </div>
  )
}


