import type { MetadataRoute } from 'next';

// Constant output; mark static so it builds under `output: 'export'` (no server).
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
