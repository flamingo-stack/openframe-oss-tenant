import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
import { useMemo } from 'react';
import type { TagEntry } from '@/app/components/shared/tags';
import { buildInstallCommand } from '../utils/device-command-utils';
import { useRegistrationSecret } from './use-registration-secret';
import { useReleaseVersion } from './use-release-version';

interface UseInstallCommandOptions {
  organizationId: string;
  platform: OSPlatformId;
  tags?: TagEntry[];
}

function buildTagArgs(tags: TagEntry[], platform: OSPlatformId): string[] {
  const quote = platform === 'windows' ? '"' : "'";
  return tags.flatMap(tag => tag.values.map(value => `--tag ${quote}${tag.key}=${value}${quote}`));
}

export function useInstallCommand({ organizationId, platform, tags = [] }: UseInstallCommandOptions) {
  const { initialKey } = useRegistrationSecret();
  const { releaseVersion } = useReleaseVersion();

  const serverUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'localhost';
    const { hostname } = window.location;
    return hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost --localMode' : hostname;
  }, []);

  const command = useMemo(
    () =>
      buildInstallCommand({
        platform,
        serverUrl,
        initialKey,
        orgId: organizationId,
        releaseVersion,
        additionalArgs: buildTagArgs(tags, platform),
      }),
    [initialKey, tags, platform, organizationId, serverUrl, releaseVersion],
  );

  return { command, initialKey };
}
