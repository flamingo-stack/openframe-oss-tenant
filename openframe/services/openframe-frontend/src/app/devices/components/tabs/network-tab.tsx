'use client'

import React from 'react'
import { InfoCard } from '@flamingo/ui-kit'

interface NetworkTabProps {
  device: any
}

export function NetworkTab({ device }: NetworkTabProps) {
  return (
    <div className="space-y-4">
      <InfoCard
        data={{
          title: "Public IP",
          items: [
            { label: 'IP Address', value: device?.public_ip || 'Unknown' }
          ]
        }}
      />
      <InfoCard
        data={{
          title: "Local IPs",
          items: [
            { label: 'Local Addresses', value: device?.local_ips || 'Unknown' }
          ]
        }}
      />
    </div>
  )
}
