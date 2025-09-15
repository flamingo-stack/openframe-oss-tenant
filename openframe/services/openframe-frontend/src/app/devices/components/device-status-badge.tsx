'use client'

import React from 'react'
import { cn } from '@flamingo/ui-kit/utils'
import { getDeviceStatusConfig } from '../utils/device-status'

interface DeviceStatusBadgeProps {
  status: string
  className?: string
}

export function DeviceStatusBadge({ status, className }: DeviceStatusBadgeProps) {
  const statusConfig = getDeviceStatusConfig(status)
  
  const getStatusColors = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'bg-[#22c55e]/20 text-[#22c55e]'
      case 'error':
        return 'bg-[#ef4444]/20 text-[#ef4444]'
      case 'warning':
        return 'bg-[#f59e0b]/20 text-[#f59e0b]'
      case 'critical':
        return 'bg-[#dc2626]/20 text-[#dc2626]'
      case 'info':
      default:
        return 'bg-[#3b82f6]/20 text-[#3b82f6]'
    }
  }

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-[6px] text-xs font-medium uppercase",
        getStatusColors(statusConfig.variant),
        className
      )}
    >
      {statusConfig.label}
    </span>
  )
}