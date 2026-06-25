'use client';

import {
  OPENFRAME_DOCTOR_COMMANDS,
  PathsDisplay,
  WarningBlock,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
import { useCallback } from 'react';
import { useCopyToClipboard } from '@/app/hooks/use-copy-to-clipboard';

interface DoctorModeWarningProps {
  platform: OSPlatformId;
}

export function DoctorModeWarning({ platform }: DoctorModeWarningProps) {
  const { copy } = useCopyToClipboard({
    successTitle: 'Command copied',
    successDescription: 'Doctor command copied to clipboard',
    errorTitle: 'Copy failed',
    errorDescription: 'Could not copy command',
  });

  const copyCommand = useCallback((command: string) => copy(command), [copy]);

  return (
    <WarningBlock title="Device not appearing or stuck pending?">
      <p className="text-h4 text-ods-text-primary">
        Run the doctor command to diagnose installation issues and repair the agent. It works even if the agent
        didn&apos;t install correctly.
      </p>
      <PathsDisplay paths={[OPENFRAME_DOCTOR_COMMANDS[platform]]} onCopyPath={copyCommand} />
    </WarningBlock>
  );
}
