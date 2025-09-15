'use client'

import React from 'react'
import { InfoCard } from '@flamingo/ui-kit'

interface AgentsTabProps {
  device: any
}

export function AgentsTab({ device }: AgentsTabProps) {
  return (
    <div className="space-y-4">
      <InfoCard
        data={{
          title: "Agent ID",
          items: [
            { label: 'ID', value: device?.agent_id || 'Unknown' }
          ]
        }}
      />
      <InfoCard
        data={{
          title: "Agent Version",
          items: [
            { label: 'Version', value: device?.version || 'Unknown' }
          ]
        }}
      />
    </div>
  )
}
