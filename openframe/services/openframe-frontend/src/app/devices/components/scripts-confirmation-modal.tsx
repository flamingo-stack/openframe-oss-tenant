'use client'

import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@flamingo/ui-kit'

interface ScriptsConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onDeviceLogs: () => void
}

export function ScriptsConfirmationModal({ 
  isOpen, 
  onClose, 
  onDeviceLogs
}: ScriptsConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#212121] border border-[#3a3a3a] rounded-[6px] w-full max-w-[500px] flex flex-col p-8 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-['Azeret_Mono'] font-semibold text-[32px] text-[#fafafa] tracking-[-0.64px] leading-[40px]">
            Scripts Running
          </h2>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Main message */}
          <div className="text-center">
            <p className="font-['DM_Sans'] text-[18px] text-[#fafafa] leading-[24px]">
              You can check the results in the device logs section.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4">
          <Button
            onClick={onClose}
            className="flex-1 bg-[#212121] border border-[#3a3a3a] text-[#fafafa] font-['DM_Sans'] font-bold text-[18px] leading-[24px] px-4 py-3 rounded-[6px] hover:bg-[#3a3a3a] transition-colors"
          >
            Close
          </Button>
          <Button
            onClick={onDeviceLogs}
            className="flex-1 bg-[#ffc008] text-[#212121] font-['DM_Sans'] font-bold text-[18px] leading-[24px] px-4 py-3 rounded-[6px] hover:bg-[#ffd951] transition-colors"
          >
            Device Logs
          </Button>
        </div>
      </div>
    </div>
  )
}
