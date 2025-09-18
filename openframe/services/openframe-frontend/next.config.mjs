/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pure frontend configuration - no server-side features
  output: 'export',  // Static export for pure client-side
  trailingSlash: true,
  distDir: 'dist',   // Output directory for static export
  images: {
    unoptimized: true  // No server-side image optimization
  },
  env: {
    NEXT_PUBLIC_APP_TYPE: 'openframe',
  },
  // Disable server-side features
  poweredByHeader: false,
  reactStrictMode: true,
  // Disable SSR completely
  experimental: {
    esmExternals: true,
    forceSwcTransforms: true,
  },
  // Force client-side rendering
  basePath: '',
  assetPrefix: '',
  // Transpile the ui-kit package to handle TypeScript files
  transpilePackages: ['@flamingo/ui-kit'],
}

export default nextConfig