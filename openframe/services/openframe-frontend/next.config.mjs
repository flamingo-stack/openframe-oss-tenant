import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: projectRoot,
  trailingSlash: true,
  distDir: 'dist',
  images: {
    unoptimized: true, // No server-side image optimization
  },
  compiler: {
    relay: {
      src: './src',
      language: 'typescript',
      artifactDirectory: './src/__generated__',
    },
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    // App mode configuration
    NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE || 'oss-tenant',
    NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER: process.env.NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER,
    // Hosts for API routing
    NEXT_PUBLIC_TENANT_HOST_URL: process.env.NEXT_PUBLIC_TENANT_HOST_URL,
    NEXT_PUBLIC_SHARED_HOST_URL: process.env.NEXT_PUBLIC_SHARED_HOST_URL,
    // Google Tag Manager container
    NEXT_PUBLIC_GTM_CONTAINER_ID: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID,
  },
  // Disable server-side features
  poweredByHeader: false,
  reactStrictMode: true,
  // Next.js 16: esmExternals is now default, forceSwcTransforms removed
  // Turbopack is now the default bundler
  generateBuildId: () => 'build',
  // Force client-side rendering
  basePath: '',
  assetPrefix: '',
};

export default nextConfig;
