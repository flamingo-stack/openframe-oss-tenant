import { KnowledgeBaseDocsView } from './knowledge-base-docs-view';

/** Knowledge-base landing — the docs hub at its root (`docPath = ''`). Deep
 *  links into individual docs are served by the sibling `[...path]` route. */
export default function KnowledgeBasePage() {
  return <KnowledgeBaseDocsView docPath="" />;
}
