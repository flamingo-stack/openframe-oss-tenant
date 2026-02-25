import { runtimeEnv } from '../runtime-config';

export type MeshUrlParts = {
  baseHostPort: string;
  scheme: 'ws' | 'wss';
};

export function getMeshBaseHostPort(): string | null {
  const tenantHost = runtimeEnv.tenantHostUrl();

  if (!tenantHost) {
    return null;
  }

  const env = `${tenantHost}/ws/tools/meshcentral-server`;

  // Strip protocols if provided
  if (env.startsWith('ws://')) return env.substring('ws://'.length);
  if (env.startsWith('wss://')) return env.substring('wss://'.length);
  if (env.startsWith('http://')) return env.substring('http://'.length);
  if (env.startsWith('https://')) return env.substring('https://'.length);
  return env;
}

export function getMeshWsScheme(): 'ws' | 'wss' {
  if (typeof window !== 'undefined') {
    return window.location.protocol === 'https:' ? 'wss' : 'wss';
  }

  return 'wss';
}

export function buildWsUrl(path: string): string {
  const base = getMeshBaseHostPort();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!base && typeof window !== 'undefined') {
    const scheme = getMeshWsScheme();
    const host = window.location.host;

    // Always use the proxy path for now since that's how the backend is configured
    return `${scheme}://${host}/ws/tools/meshcentral-server${normalizedPath}`;
  }

  if (base) {
    const scheme = getMeshWsScheme();
    return `${scheme}://${base}${normalizedPath}`;
  }

  const scheme = getMeshWsScheme();
  return `${scheme}://localhost/ws/tools/meshcentral-server${normalizedPath}`;
}

export const MESH_USER = process.env.NEXT_PUBLIC_MESH_USER || 'mesh@openframe.io';
export const MESH_PASS = process.env.NEXT_PUBLIC_MESH_PASS || 'meshpass@1234';
