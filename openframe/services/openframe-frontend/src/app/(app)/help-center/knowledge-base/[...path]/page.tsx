import { normalizeDocPath } from '@flamingo-stack/openframe-frontend-core/utils';
import { KnowledgeBaseDocsView } from '../knowledge-base-docs-view';

export const dynamic = 'force-dynamic';

/**
 * Deep-link route for an individual doc (`/help-center/knowledge-base/<path>`).
 * `normalizeDocPath` lowercases + joins the catch-all segments into the path
 * the viewer resolves against the tree (the same SSOT the hub uses), so a hard
 * load / shared link lands on the right doc instead of the root.
 */
export default async function KnowledgeBaseDocPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return <KnowledgeBaseDocsView docPath={normalizeDocPath(path)} />;
}
