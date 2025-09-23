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
    // App mode configuration - defaults to full-app if not set
    NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE || 'full-app',
    NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER: process.env.NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER
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