'use client';

import {
  OPENFRAME_PATHS,
  PathsDisplay,
  WarningBlock,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
import { useCallback, useMemo } from 'react';
import { useCopyToClipboard } from '@/app/hooks/use-copy-to-clipboard';

interface AntivirusWarningProps {
  platform: OSPlatformId;
}

export function AntivirusWarning({ platform }: AntivirusWarningProps) {
  const { copy } = useCopyToClipboard({
    successTitle: 'Path copied',
    successDescription: 'Folder path copied to clipboard',
    errorTitle: 'Copy failed',
    errorDescription: 'Could not copy path',
  });

  const paths = useMemo(() => {
    if (platform === 'windows') return OPENFRAME_PATHS.windows;
    if (platform === 'darwin') return OPENFRAME_PATHS.darwin;
    return [];
  }, [platform]);

  const copyPath = useCallback((path: string) => copy(path), [copy]);

  if (paths.length === 0) return null;

  return (
    <WarningBlock title="Your antivirus may block OpenFrame installation. This is a false positive.">
      <PathsDisplay
        paths={paths}
        title="If blocked, add these folders to your antivirus exclusions list:"
        onCopyPath={copyPath}
      />
      <p className="text-h4 text-ods-text-primary">
        Or temporarily disable protection during installation. OpenFrame is safe open-source software. Blocks happen
        because new software needs time to build reputation with security vendors.
      </p>
    </WarningBlock>
  );
}
