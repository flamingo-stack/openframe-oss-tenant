import { ReleaseDetailClient } from './release-detail-client';

// Release slugs are runtime/CMS content (not build-enumerable). `output: 'export'`
// rejects an empty param list, so we prerender a single placeholder shell; real
// release slugs are served by the native shell's SPA fallback (the web/standalone
// build serves them dynamically). See docs/static-export-migration.md.
export function generateStaticParams(): { slug: string }[] {
  return [{ slug: 'index' }];
}

export default function ReleaseDetailRoute() {
  return <ReleaseDetailClient />;
}
