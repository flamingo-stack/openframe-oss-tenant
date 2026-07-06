import { LegalPageClient } from './legal-page-client';

// docTypes are enumerable, so `output: 'export'` prerenders both legal pages.
// generateStaticParams is server-only; the rendering lives in the client child.
export function generateStaticParams() {
  return [{ docType: 'privacy' }, { docType: 'terms' }];
}

export default function LegalPage() {
  return <LegalPageClient />;
}
