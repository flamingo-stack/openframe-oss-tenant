'use client';

import { OSTypeIcon, PathsDisplay, WarningBlock } from '@flamingo-stack/openframe-frontend-core/components/features';
import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';

interface AdminPrivilegesWarningProps {
  platform: OSPlatformId;
}

/** Platform-specific instruction shown beside the platform icon. */
const PLATFORM_INSTRUCTION: Record<OSPlatformId, string> = {
  windows: 'Run PowerShell as Local Administrator',
  darwin: 'Run Terminal with sudo privileges',
  linux: 'Run Terminal with sudo privileges',
};

/** Platform-specific elevation note. */
const PLATFORM_NOTE: Record<OSPlatformId, string> = {
  windows:
    'Without elevated privileges, the installation will fail silently. Right-click PowerShell and select "Run as administrator," or contact your IT admin if you don\'t have local admin rights.',
  darwin:
    "Without elevated privileges, the installation will fail silently. Prefix the command with sudo, or contact your IT admin if you don't have administrator rights.",
  linux:
    "Without elevated privileges, the installation will fail silently. Prefix the command with sudo, or contact your IT admin if you don't have administrator rights.",
};

export function AdminPrivilegesWarning({ platform }: AdminPrivilegesWarningProps) {
  return (
    <WarningBlock title="Administrator privileges are required to install the OpenFrame agent.">
      <p className="text-h4 text-ods-text-primary">
        Run the command with the appropriate permissions for your platform:
      </p>
      <PathsDisplay
        paths={[PLATFORM_INSTRUCTION[platform]]}
        showCopyButtons={false}
        leadingIcon={<OSTypeIcon osType={platform} size="w-6 h-6" />}
      />
      <p className="text-h4 text-ods-text-primary">{PLATFORM_NOTE[platform]}</p>
    </WarningBlock>
  );
}
