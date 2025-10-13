/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pure frontend configuration - no server-side features
  // output: 'export', 
  trailingSlash: true,
  distDir: 'dist',   // Output directory for static export
  images: {
    unoptimized: true  // No server-side image optimization
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
  // Disable SSR completely and static generation
  experimental: {
    esmExternals: true,
    forceSwcTransforms: true,
  },
  generateBuildId: () => 'build',
  // Force client-side rendering
  basePath: '',
  assetPrefix: '',
  // Transpile the ui-kit package to handle TypeScript files
  transpilePackages: ['@flamingo/ui-kit'],
}

export default nextConfig