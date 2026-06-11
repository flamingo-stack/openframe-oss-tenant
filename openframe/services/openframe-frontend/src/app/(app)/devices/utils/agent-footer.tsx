import { FlamingoLogo } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { ShieldCheckIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { ReactNode } from 'react';
import type { ToolType } from '../types/device.types';

export interface InfoCardFooterData {
  icon?: ReactNode;
  text: string;
  logo?: ReactNode;
  link?: {
    href: string;
    label?: string;
  };
}

/** External repository links per tool type; agents without an entry get no footer */
const AGENT_REPO_LINKS: Record<ToolType, string> = {
  FLEET_MDM: 'https://github.com/flamingo-ai/fleetdm',
  MESHCENTRAL: 'https://github.com/flamingo-ai/meshcentral',
  TACTICAL_RMM: 'https://github.com/flamingo-ai/tactical-rmm',
};

/** toolType stays a string: agents-tab synthesizes values outside ToolType (e.g. OSQUERYD) */
export function getAgentFooter(toolType: string): InfoCardFooterData | undefined {
  const href = AGENT_REPO_LINKS[toolType as ToolType];
  if (!href) return undefined;

  return {
    icon: <ShieldCheckIcon size={24} className="text-ods-success" />,
    text: 'Signed by Flamingo',
    logo: <FlamingoLogo width={24} height={24} />,
    link: { href },
  };
}
