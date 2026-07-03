import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import withBundleAnalyzer from '@next/bundle-analyzer';

const projectRoot = dirname(fileURLToPath(import.meta.url));

// Build target selector. `export` produces a static SPA bundle for the native
// shells (Capacitor mobile / Tauri desktop); anything else keeps the SSR
// `standalone` server build used by the web deployment. Gating on env lets ONE
// codebase serve browser + desktop + mobile — see docs/static-export-migration.md.
// Build-time only (not NEXT_PUBLIC_): never shipped to the client bundle.
const isStaticExport = process.env.OPENFRAME_BUILD_TARGET === 'export';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isStaticExport ? 'export' : 'standalone',
  // `outputFileTracingRoot` only matters for the standalone Node server bundle;
  // it has no meaning under `output: 'export'`.
  ...(isStaticExport ? {} : { outputFileTracingRoot: projectRoot }),
  transpilePackages: ['@flamingo-stack/openframe-frontend-core'],
  trailingSlash: true,
  // `skipTrailingSlashRedirect` suppresses the automatic /x -> /x/ redirect.
  // It exists ONLY for the standalone `/content/*` chat proxy (so the gateway
  // sees the un-slashed path before the rewrite). Under `output: export` it is
  // harmful: it makes the App Router navigate to slash-less paths (`/dashboard`)
  // that a static file host (capacitor://localhost) can't resolve to
  // `dashboard/index.html`, so client navigation AND its hard-nav fallback fail
  // ("Failed to fetch RSC payload … Load failed"). Standalone-only so the export
  // build uses the canonical `/dashboard/` form the webview can serve.
  ...(isStaticExport ? {} : { skipTrailingSlashRedirect: true }),
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
  //
  // `rewrites()` is unsupported under `output: 'export'` (no server to run
  // them), so it is omitted in export mode; the embedded-chat proxy is replaced
  // there by absolute gateway URLs + Bearer + CORS (migration item 7).
  ...(isStaticExport
    ? {}
    : {
        async rewrites() {
          const tenantHost = (process.env.NEXT_PUBLIC_TENANT_HOST_URL || '').replace(/\/+$/, '');
          if (!tenantHost) return [];
          return {
            beforeFiles: [{ source: '/content/:path*', destination: `${tenantHost}/content/:path*` }],
          };
        },
      }),
};

export default phase => {
  // Cap Turbopack's native memory in the dev server only ('phase-development-server' ===
  // PHASE_DEVELOPMENT_SERVER); the prod `next build` (also Turbopack) stays uncapped so
  // CI/Docker can use available RAM.
  const config =
    phase === 'phase-development-server'
      ? { ...nextConfig, experimental: { turbopackMemoryLimit: 8 * 1024 * 1024 * 1024 } }
      : nextConfig;
  return withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(config);
};
