'use client';

import { OPENFRAME_PATHS, PathsDisplay } from '@flamingo-stack/openframe-frontend-core/components/features';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
import { AlertTriangle } from 'lucide-react';
import { useCallback, useMemo } from 'react';

interface AntivirusWarningProps {
  platform: OSPlatformId;
}

export function AntivirusWarning({ platform }: AntivirusWarningProps) {
  const { toast } = useToast();

  const paths = useMemo(() => {
    if (platform === 'windows') return OPENFRAME_PATHS.windows;
    if (platform === 'darwin') return OPENFRAME_PATHS.darwin;
    return [];
  }, [platform]);

  const copyPath = useCallback(
    async (path: string) => {
      try {
        await navigator.clipboard.writeText(path);
        toast({ title: 'Path copied', description: 'Folder path copied to clipboard', variant: 'default' });
      } catch (_e) {
        toast({ title: 'Copy failed', description: 'Could not copy path', variant: 'destructive' });
      }
    },
    [toast],
  );

  if (paths.length === 0) return null;

  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] p-6 flex flex-col gap-4">
      <div className="bg-[var(--ods-attention-yellow-warning-secondary)] rounded-[6px] p-4 flex gap-4 items-start">
        <AlertTriangle className="w-6 h-6 text-[var(--ods-attention-yellow-warning)] shrink-0" />
        <p className="text-[var(--ods-attention-yellow-warning)] font-bold text-[16px] md:text-[18px]">
          Your antivirus may block OpenFrame installation. This is a false positive.
        </p>
      </div>

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
