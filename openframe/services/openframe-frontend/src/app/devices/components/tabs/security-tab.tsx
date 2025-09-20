'use client'

import React from 'react'
import { InfoCard } from '@flamingo/ui-kit'

interface SecurityTabProps {
  device: any
}

export function SecurityTab({ device }: SecurityTabProps) {
  return (
    <div className="space-y-4">
      <InfoCard
        data={{
          title: "Agent Version",
          items: [
            { label: 'Version', value: device?.version || 'Unknown' }
          ]
        }}
      />
      <InfoCard
        data={{
          title: "Last Seen",
          items: [
            { label: 'Last Activity', value: device?.last_seen ? new Date(device.last_seen).toLocaleString() : 'Unknown' }
          ]
        }}
      />
    </div>
  )
}
