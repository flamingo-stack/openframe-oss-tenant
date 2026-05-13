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
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig);
