'use client'

import React from 'react'
import { InfoCard, Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@flamingo/ui-kit'
import { ToolBadge } from '@flamingo/ui-kit/components/platform'
import { Info as InfoIcon } from 'lucide-react'
import { toUiKitToolType } from '@lib/tool-labels'

interface AgentsTabProps {
  device: any
}

export function AgentsTab({ device }: AgentsTabProps) {
  const toolConnections = Array.isArray(device?.toolConnections) ? device.toolConnections : []

  return (
    <TooltipProvider delayDuration={0}>
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {toolConnections.length > 0 ? (
        toolConnections.map((tc: any, idx: number) => {
          const toolType = toUiKitToolType(tc?.toolType)
          return (
            <div key={`${tc?.toolType || 'unknown'}-${tc?.agentToolId || idx}`} className="relative">
              <div className="absolute top-4 left-4 z-10">
                <ToolBadge toolType={toolType} />
              </div>
              <div className="absolute top-4 right-4 z-10">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>Integrated agent connection from Tactical RMM or Fleet MDM. Shows the unique agent ID for this device in the connected management platform.</p>
                  </TooltipContent>
                </Tooltip>
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
            icon: (
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[500px] min-w-[400px]">
                  <p>No management agents are currently connected to this device. Agents provide remote management capabilities through Tactical RMM and Fleet MDM.</p>
                </TooltipContent>
              </Tooltip>
            ),
            items: [
              { label: 'Status', value: 'No agents found' }
            ]
          }}
        />
      )}
    </div>
    </TooltipProvider>
  )
}
