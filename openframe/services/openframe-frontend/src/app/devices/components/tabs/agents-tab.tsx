'use client';

import {
  InfoCard,
  Tag,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@flamingo-stack/openframe-frontend-core';
import { ToolBadge } from '@flamingo-stack/openframe-frontend-core/components';
import { normalizeToolTypeWithFallback } from '@flamingo-stack/openframe-frontend-core/utils';
import { Info as InfoIcon } from 'lucide-react';
import type { Device, InstalledAgent, ToolConnection } from '../../types/device.types';
import { getDeviceStatusConfig } from '../../utils/device-status';

interface AgentsTabProps {
  device: Device;
}

const agentTypeToToolType: Record<string, string> = {
  'fleetmdm-agent': 'FLEET_MDM',
  'tacticalrmm-agent': 'TACTICAL_RMM',
  'meshcentral-agent': 'MESHCENTRAL',
  'openframe-chat': 'OPENFRAME_CHAT',
  'openframe-client': 'OPENFRAME_CLIENT',
  osqueryd: 'OSQUERY',
};

const AGENT_TYPES_WITH_STATUS = new Set(['TACTICAL_RMM', 'FLEET_MDM', 'MESHCENTRAL']);

/** Tactical RMM: "online" → online, "overdue" | "offline" | other → offline */
function parseTacticalAgentStatus(raw: string | undefined): 'online' | 'offline' {
  return raw?.toLowerCase() === 'online' ? 'online' : 'offline';
}

/** Fleet MDM: "online" → online, "offline" | "mia" → offline */
function parseFleetAgentStatus(raw: string | undefined): 'online' | 'offline' {
  return raw?.toLowerCase() === 'online' ? 'online' : 'offline';
}

/** MeshCentral: same as Fleet for display (online/offline) */
function parseMeshCentralAgentStatus(raw: string | undefined): 'online' | 'offline' {
  return raw?.toLowerCase() === 'online' ? 'online' : 'offline';
}

function getAgentDisplayStatus(toolType: string, raw: string | undefined): 'online' | 'offline' {
  switch (toolType) {
    case 'TACTICAL_RMM':
      return parseTacticalAgentStatus(raw);
    case 'FLEET_MDM':
      return parseFleetAgentStatus(raw);
    case 'MESHCENTRAL':
      return parseMeshCentralAgentStatus(raw);
    default:
      return 'offline';
  }
}

export function AgentsTab({ device }: AgentsTabProps) {
  const toolConnections = Array.isArray(device?.toolConnections) ? device.toolConnections : [];
  const installedAgents = Array.isArray(device?.installedAgents) ? device.installedAgents : [];

  const connectionMap = new Map<string, ToolConnection>();
  toolConnections.forEach((tc: ToolConnection) => {
    connectionMap.set(tc.toolType, tc);
  });

  const combinedAgents = installedAgents.map((agent: InstalledAgent) => {
    const mappedToolType = agentTypeToToolType[agent.agentType];
    const connection = mappedToolType ? connectionMap.get(mappedToolType) : null;

    const toolType = mappedToolType || agent.agentType.toUpperCase().replace(/-/g, '_');
    return {
      agentType: agent.agentType,
      version: agent.version,
      toolType,
      agentToolId: connection?.agentToolId,
      hasConnection: !!connection,
      status: getAgentDisplayStatus(toolType, connection?.status),
      lastSeen: connection?.lastSeen,
      lastFetched: connection?.lastFetched,
    };
  });

  toolConnections.forEach((tc: ToolConnection) => {
    const hasInstalledAgent = installedAgents.some(
      (agent: InstalledAgent) => agentTypeToToolType[agent.agentType] === tc.toolType,
    );

    if (!hasInstalledAgent) {
      combinedAgents.push({
        agentType: tc.toolType.toLowerCase().replace(/_/g, '-'),
        version: undefined,
        toolType: tc.toolType,
        agentToolId: tc.agentToolId,
        hasConnection: true,
        status: getAgentDisplayStatus(tc.toolType, tc.status),
        lastSeen: tc.lastSeen,
        lastFetched: tc.lastFetched,
      });
    }
  });

  // Sort agents to show those with agentToolId first
  combinedAgents.sort((a, b) => {
    if (a.agentToolId && !b.agentToolId) return -1;
    if (!a.agentToolId && b.agentToolId) return 1;
    return 0;
  });

  const hasAgents = combinedAgents.length > 0;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {hasAgents ? (
          combinedAgents.map((agent: any, idx: number) => {
            const toolType = normalizeToolTypeWithFallback(agent.toolType);
            const statusConfig = getDeviceStatusConfig(agent.status ?? 'offline');
            const items = [];

            if (
              AGENT_TYPES_WITH_STATUS.has(agent.toolType) &&
              (agent.status != null || agent.lastSeen != null || agent.lastFetched != null)
            ) {
              if (agent.status != null) {
                items.push({
                  label: 'Status',
                  value: <Tag label={statusConfig.label} variant={statusConfig.variant} />,
                });
              }
              if (agent.lastSeen) {
                const d = new Date(agent.lastSeen);
                const formatted =
                  d.getTime() > 0
                    ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : '—';
                items.push({ label: 'Last seen', value: formatted });
              }
            }

            if (agent.agentToolId) {
              items.push({ label: 'ID', value: agent.agentToolId, copyable: true });
            }

            if (agent.version) {
              items.push({ label: 'Version', value: agent.version });
            }

            if (AGENT_TYPES_WITH_STATUS.has(agent.toolType) && agent.lastFetched != null) {
              const d = new Date(agent.lastFetched);
              const formatted =
                d.getTime() > 0
                  ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : '—';
              items.push({ label: 'Last fetched', value: formatted });
            }

            return (
              <div key={`${agent.agentType}-${agent.agentToolId || idx}`} className="relative flex flex-col">
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
                          : `${toolType} agent installed.`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <InfoCard
                  data={{
                    items: items,
                  }}
                  className="pt-16 flex-1 min-h-0"
                />
              </div>
            );
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
                      <p>
                        No management agents are currently installed on this device. Agents provide remote management
                        capabilities through Tactical RMM, Fleet MDM, and other platforms.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ),
                items: [{ label: 'Status', value: 'No agents found' }],
              }}
              className="h-full"
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
