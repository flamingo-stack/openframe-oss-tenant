'use client';

import type { DocumentTypeRenderers } from '@flamingo-stack/openframe-frontend-core/components/docs';
import { DocsHubPage } from '@flamingo-stack/openframe-frontend-core/components/docs';
import { RichMarkdownRenderer } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { EP, HELP_CENTER_BASE, KNOWLEDGE_BASE_ROUTE } from '../endpoints';

/** Public knowledge-hub doc source — must match the hub's `DOC_SOURCES` id. */
const KB_SOURCE_ID = 'openframe-docs';

/**
 * The one renderer `<DocsHubPage>` requires — the lib ships no default markdown
 * renderer so each host picks its own library. Hands the doc body to the lib's
 * `<RichMarkdownRenderer>`, threading the viewer's internal-link handlers so
 * relative `./intro.md` links resolve via `/api/docs/resolve-link` instead of
 * 404ing. Raw Mermaid files (`.mmd`, stored without a code fence) are wrapped in
 * a ```mermaid block so they render as diagrams, mirroring the hub.
 */
const markdownRenderer: DocumentTypeRenderers['markdown'] = (content, handlers) => {
  const body = /\.mmd$/i.test(content.path)
    ? content.content.trim() && `\`\`\`mermaid\n${content.content.trim()}\n\`\`\`\n`
    : content.content;
  return (
    <RichMarkdownRenderer
      content={body || ''}
      sectionIds={content.sections}
      onInternalLinkClick={handlers.onInternalLinkClick}
      brokenLinks={content.brokenLinks}
      currentPath={handlers.currentPath}
      resolveSource={handlers.sourceId}
    />
  );
};

/**
 * OpenFrame's knowledge-base docs hub — the in-app twin of the hub's
 * `/knowledge-base` page. `<DocsHubPage>` (lib) owns all the chrome, the
 * sidebar tree, scroll-spy, internal-link resolution and the in-source search
 * bar; we only supply the host seams:
 *   - the four `/content`-proxied doc endpoints (tree / content / resolve-link
 *     / search → the hub's `/api/docs/*`),
 *   - the markdown renderer (the one renderer the lib requires), and
 *   - the in-app `baseRoute` so sidebar/internal-link navigation soft-navs to
 *     `/help-center/knowledge-base/<path>` instead of the hub origin.
 *
 * `chatSource` is the trusted, server-known platform id (never user input) the
 * lib flows into resolve-link/search — OpenFrame is always `'openframe'`.
 */
export function KnowledgeBaseDocsView({ docPath }: { docPath: string }) {
  return (
    <DocsHubPage
      sourceId={KB_SOURCE_ID}
      chatSource="openframe"
      title="Knowledge Base"
      subtitle="Comprehensive guides and references for the OpenFrame platform"
      shell={false}
      docPath={docPath}
      baseRoute={KNOWLEDGE_BASE_ROUTE}
      sidebarLabel="DOCUMENTATION"
      structureEndpoint={EP.docsStructure(KB_SOURCE_ID)}
      contentEndpoint={EP.docsContent(KB_SOURCE_ID)}
      resolveLinkEndpoint={EP.docsResolveLink}
      searchEndpoint={EP.docsSearch}
      documentTypeRenderers={{ markdown: markdownRenderer }}
      backButton={{ label: 'Back to Help Center', href: HELP_CENTER_BASE }}
    />
  );
}
