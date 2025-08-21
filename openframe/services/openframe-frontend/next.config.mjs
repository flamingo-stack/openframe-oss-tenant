/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pure frontend configuration - no server-side features
  output: 'export',  // Static export for pure client-side
  trailingSlash: true,
  images: {
    unoptimized: true  // No server-side image optimization
  },
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_APP_TYPE: 'openframe',
  },
}

export default nextConfig