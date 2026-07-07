import type { InfoCardFooterData } from '@flamingo-stack/openframe-frontend-core';
import { FlamingoLogo } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { ShieldCheckIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { ToolType } from '../types/device.types';

/** External repository links per tool type; agents without an entry get no footer */
const AGENT_REPO_LINKS: Record<ToolType, string> = {
  FLEET_MDM: 'https://github.com/flamingo-stack/fleetmdm',
  MESHCENTRAL: 'https://github.com/flamingo-stack/meshagent',
};

function isLinkedToolType(toolType: string): toolType is ToolType {
  return Object.hasOwn(AGENT_REPO_LINKS, toolType);
}

/** toolType stays a string: agents-tab synthesizes values outside ToolType (e.g. OSQUERYD) */
export function getAgentFooter(toolType: string): InfoCardFooterData | undefined {
  if (!isLinkedToolType(toolType)) return undefined;
  const href = AGENT_REPO_LINKS[toolType];

  return {
    icon: <ShieldCheckIcon size={24} className="text-ods-success" />,
    text: 'Signed by Flamingo',
    logo: <FlamingoLogo width={24} height={24} />,
    link: { href },
  };
}
