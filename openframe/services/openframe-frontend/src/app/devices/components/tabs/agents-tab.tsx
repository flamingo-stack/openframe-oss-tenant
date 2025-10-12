'use client'

import React from 'react'
import { InfoCard } from '@flamingo/ui-kit'
import { ToolBadge } from '@flamingo/ui-kit/components/platform'
import { toUiKitToolType } from '@lib/tool-labels'

interface AgentsTabProps {
  device: any
}

export function AgentsTab({ device }: AgentsTabProps) {
  const toolConnections = Array.isArray(device?.toolConnections) ? device.toolConnections : []

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {toolConnections.length > 0 ? (
        toolConnections.map((tc: any, idx: number) => {
          const toolType = toUiKitToolType(tc?.toolType)
          return (
            <div key={`${tc?.toolType || 'unknown'}-${tc?.agentToolId || idx}`} className="relative">
              <div className="absolute top-4 left-4 z-10">
                <ToolBadge toolType={toolType} />
              </div>
              <InfoCard
                data={{
                  items: [
                    { label: 'ID', value: tc?.agentToolId || 'Unknown', copyable: true },
                  ]
                }}
                className="pt-16"
              />
            </div>
          )
        })
      ) : (
        <InfoCard
          data={{
            title: 'Agents',
            items: [
              { label: 'Status', value: 'No agents found' }
            ]
          }}
        />
      )}
    </div>
  )
}
