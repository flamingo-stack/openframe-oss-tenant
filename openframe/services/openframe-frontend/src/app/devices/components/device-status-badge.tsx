'use client'

import React from 'react'
import { cn } from '@flamingo-stack/openframe-frontend-core/utils'
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
        return 'bg-success/20 text-success'
      case 'error':
        return 'bg-error/20 text-error'
      case 'warning':
        return 'bg-warning/20 text-warning'
      case 'critical':
        return 'bg-error/20 text-error'
      case 'info':
      default:
        return 'bg-info/20 text-info'
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