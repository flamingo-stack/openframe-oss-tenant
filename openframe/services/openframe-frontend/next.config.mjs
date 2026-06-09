import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import withBundleAnalyzer from '@next/bundle-analyzer';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: projectRoot,
  transpilePackages: ['@flamingo-stack/openframe-frontend-core'],
  trailingSlash: true,
  // Keep `trailingSlash` link generation but suppress the automatic
  // /x -> /x/ redirect, which otherwise 308s `/content/*` chat requests
  // (adding a slash) before the rewrite below can proxy them — sending a
  // trailing-slash path the gateway doesn't recognize.
  skipTrailingSlashRedirect: true,
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  compiler: {
    relay: {
      src: './src',
      language: 'typescript',
      artifactDirectory: './src/__generated__',
    },
  },
  poweredByHeader: false,
  // Proxy the embedded-chat `/content/*` calls to the tenant gateway from the
  // Next server so the browser always sees a same-origin URL — the lib's
  // `embedAuthedFetch` rejects cross-origin URLs in production builds.
  //
  // NOTE: `rewrites()` is evaluated at BUILD time, so the destination is fixed
  // by the env present when `next build` runs. The deployed Docker image builds
  // with no `NEXT_PUBLIC_TENANT_HOST_URL` (`.env*` is dockerignored), so this
  // returns [] there and the platform's same-origin reverse proxy answers
  // `/content/*` directly. The rewrite exists for LOCAL `next dev` / `next build`
  // (and any image built with the host set), where the dev/build-time env
  // supplies the gateway so chat works without the dev-only cross-origin hatch.
  async rewrites() {
    const tenantHost = (process.env.NEXT_PUBLIC_TENANT_HOST_URL || '').replace(/\/+$/, '');
    if (!tenantHost) return [];
    return {
      beforeFiles: [{ source: '/content/:path*', destination: `${tenantHost}/content/:path*` }],
    };
  },
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig);
