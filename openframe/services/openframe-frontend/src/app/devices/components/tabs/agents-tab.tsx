'use client'

import { InfoCard, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@flamingo-stack/openframe-frontend-core'
import { ToolBadge } from '@flamingo-stack/openframe-frontend-core/components'
import { normalizeToolTypeWithFallback } from '@flamingo-stack/openframe-frontend-core/utils'
import { Info as InfoIcon } from 'lucide-react'
import type { Device, InstalledAgent, ToolConnection } from '../../types/device.types'

interface AgentsTabProps {
  device: Device
}

const agentTypeToToolType: Record<string, string> = {
  'fleetmdm-agent': 'FLEET_MDM',
  'tacticalrmm-agent': 'TACTICAL_RMM',
  'meshcentral-agent': 'MESHCENTRAL',
  'openframe-chat': 'OPENFRAME_CHAT',
  'openframe-client': 'OPENFRAME_CLIENT'
}

export function AgentsTab({ device }: AgentsTabProps) {
  const toolConnections = Array.isArray(device?.toolConnections) ? device.toolConnections : []
  const installedAgents = Array.isArray(device?.installedAgents) ? device.installedAgents : []

  const connectionMap = new Map<string, ToolConnection>()
  toolConnections.forEach((tc: ToolConnection) => {
    connectionMap.set(tc.toolType, tc)
  })

  const combinedAgents = installedAgents.map((agent: InstalledAgent) => {
    const mappedToolType = agentTypeToToolType[agent.agentType]
    const connection = mappedToolType ? connectionMap.get(mappedToolType) : null
    
    return {
      agentType: agent.agentType,
      version: agent.version,
      toolType: mappedToolType || agent.agentType.toUpperCase().replace(/-/g, '_'),
      agentToolId: connection?.agentToolId,
      hasConnection: !!connection
    }
  })

  toolConnections.forEach((tc: ToolConnection) => {
    const hasInstalledAgent = installedAgents.some((agent: InstalledAgent) => 
      agentTypeToToolType[agent.agentType] === tc.toolType
    )
    
    if (!hasInstalledAgent) {
      combinedAgents.push({
        agentType: tc.toolType.toLowerCase().replace(/_/g, '-'),
        version: undefined,
        toolType: tc.toolType,
        agentToolId: tc.agentToolId,
        hasConnection: true
      })
    }
  })

  const hasAgents = combinedAgents.length > 0

  return (
    <TooltipProvider delayDuration={0}>
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
      {hasAgents ? (
        combinedAgents.map((agent: any, idx: number) => {
          const toolType = normalizeToolTypeWithFallback(agent.toolType)
          const items = []
          
          if (agent.agentToolId) {
            items.push({ label: 'ID', value: agent.agentToolId, copyable: true })
          }
          
          if (agent.version) {
            items.push({ label: 'Version', value: agent.version })
          }

          return (
            <div key={`${agent.agentType}-${agent.agentToolId || idx}`} className="relative h-full">
              <div className="absolute top-4 left-4 z-10">
                <ToolBadge toolType={toolType} />
              </div>
              <div className="absolute top-4 right-4 z-10">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>
                      {agent.hasConnection 
                        ? `Connected agent from ${toolType}. Shows the unique agent ID and version for this device.`
                        : `${toolType} agent installed.`
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <InfoCard
                data={{
                  items: items
                }}
                className="pt-16 h-full"
              />
            </div>
          )
        })
      ) : (
        <div className="h-full">
          <InfoCard
            data={{
              title: 'Agents',
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>No management agents are currently installed on this device. Agents provide remote management capabilities through Tactical RMM, Fleet MDM, and other platforms.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                { label: 'Status', value: 'No agents found' }
              ]
            }}
            className="h-full"
          />
        </div>
      )}
    </div>
    </TooltipProvider>
  )
}
