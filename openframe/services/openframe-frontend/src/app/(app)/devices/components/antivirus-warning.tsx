'use client';

import { OPENFRAME_PATHS, PathsDisplay } from '@flamingo-stack/openframe-frontend-core/components/features';
import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
import { AlertTriangle } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { Alert } from '@/app/components/shared';
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
    <div className="bg-ods-card border border-ods-border rounded-[6px] p-6 flex flex-col gap-4">
      <Alert
        icon={<AlertTriangle className="w-6 h-6" />}
        title="Your antivirus may block OpenFrame installation. This is a false positive."
      />

      <PathsDisplay
        paths={paths}
        title="If blocked, add these folders to your antivirus exclusions list:"
        onCopyPath={copyPath}
      />

      <p className="text-ods-text-secondary text-[14px] md:text-[16px]">
        Or temporarily disable protection during installation. OpenFrame is safe open-source software. Blocks happen
        because new software needs time to build reputation with security vendors.
      </p>
    </div>
  );
}
