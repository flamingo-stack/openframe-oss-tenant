import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
import { useMemo } from 'react';
import type { TagEntry } from '@/app/components/shared/tags';
import { useRegistrationSecret } from './use-registration-secret';
import { useReleaseVersion } from './use-release-version';

const RELEASES_BASE_URL = 'https://github.com/flamingo-stack/openframe-oss-tenant/releases';
const MACOS_BINARY_NAME = 'openframe-client_macos.tar.gz';
const WINDOWS_BINARY_NAME = 'openframe-client_windows.zip';

function buildBinaryUrl(version: string, assetName: string) {
  if (!version) return `${RELEASES_BASE_URL}/latest/download/${assetName}`;
  return `${RELEASES_BASE_URL}/download/${version}/${assetName}`;
}

interface UseInstallCommandOptions {
  organizationId: string;
  platform: OSPlatformId;
  tags?: TagEntry[];
}

function buildTagArgs(tags: TagEntry[], platform: OSPlatformId): string {
  const quote = platform === 'windows' ? '"' : "'";
  const args = tags.flatMap(tag => tag.values.map(value => ` --tag ${quote}${tag.key}=${value}${quote}`));
  return args.join('');
}

export function useInstallCommand({ organizationId, platform, tags = [] }: UseInstallCommandOptions) {
  const { initialKey } = useRegistrationSecret();
  const { releaseVersion } = useReleaseVersion();

  const serverUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'localhost';
    const { hostname } = window.location;
    return hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost --localMode' : hostname;
  }, []);

  const macBinaryUrl = useMemo(() => buildBinaryUrl(releaseVersion, MACOS_BINARY_NAME), [releaseVersion]);
  const windowsBinaryUrl = useMemo(() => buildBinaryUrl(releaseVersion, WINDOWS_BINARY_NAME), [releaseVersion]);

  const command = useMemo(() => {
    const baseArgs = `install --serverUrl ${serverUrl} --initialKey ${initialKey} --orgId ${organizationId}`;
    const tagArgs = buildTagArgs(tags, platform);

    if (platform === 'windows') {
      const argString = `${baseArgs}${tagArgs}`;
      return `Set-Location ~; Remove-Item -Path 'openframe-client.zip','openframe-client.exe' -Force -ErrorAction SilentlyContinue; Invoke-WebRequest -Uri '${windowsBinaryUrl}' -OutFile 'openframe-client.zip'; Expand-Archive -Path 'openframe-client.zip' -DestinationPath '.' -Force; Start-Process -FilePath '.\\openframe-client.exe' -ArgumentList '${argString}' -Verb RunAs -Wait`;
    }

    return `cd ~ && rm -f openframe-client_macos.tar.gz openframe-client 2>/dev/null; curl -L -o openframe-client_macos.tar.gz '${macBinaryUrl}' && tar -xzf openframe-client_macos.tar.gz && sudo chmod +x ./openframe-client && sudo ./openframe-client ${baseArgs}${tagArgs}`;
  }, [initialKey, tags, platform, organizationId, serverUrl, macBinaryUrl, windowsBinaryUrl]);

  return { command, initialKey };
}
