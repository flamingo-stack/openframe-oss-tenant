'use client'

import React from 'react'
import { InfoCard, ToolIcon } from '@flamingo/ui-kit'
import { toStandardToolLabel, toUiKitToolType } from '@lib/tool-labels'

interface AgentsTabProps {
  device: any
}

export function AgentsTab({ device }: AgentsTabProps) {
  const toolConnections = Array.isArray(device?.toolConnections) ? device.toolConnections : []

  return (
    <div className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {toolConnections.length > 0 ? (
        toolConnections.map((tc: any, idx: number) => (
          <InfoCard
            key={`${tc?.toolType || 'unknown'}-${tc?.agentToolId || idx}`}
            data={{
              title: `${toStandardToolLabel(tc?.toolType) || 'Unknown'}`,
              icon: <ToolIcon toolType={toUiKitToolType(tc?.toolType) as any} size={18} />,
              items: [
                { label: 'ID', value: tc?.agentToolId || 'Unknown', copyable: true },
              ]
            }}
          />
        ))
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
