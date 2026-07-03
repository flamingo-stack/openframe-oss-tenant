'use client';

import { useMemo } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { useKnowledgeBaseTagsQuery as UseKnowledgeBaseTagsQueryType } from '@/__generated__/useKnowledgeBaseTagsQuery.graphql';

/**
 * Tags actually assigned to knowledge-base articles, scoped by folder / archived
 * state. Backs the list filter row + filter modal — the counterpart of `scriptsTags`.
 *
 * The article editor's tag picker uses the shared `EntityTagPicker`
 * (`tagsByEntityType(entityType: KNOWLEDGE_ARTICLE)`) instead — the full tenant
 * vocabulary, including unlinked tags — and owns its own create/delete flow.
 */
export const knowledgeBaseTagsQuery = graphql`
  query useKnowledgeBaseTagsQuery($folderId: ID, $archived: Boolean) {
    knowledgeBaseTags(folderId: $folderId, archived: $archived) {
      id
      key
      color
      description
    }
  }
`;

export type KnowledgeBaseTag = UseKnowledgeBaseTagsQueryType['response']['knowledgeBaseTags'][number];

interface UseKnowledgeBaseTagsOptions {
  folderId?: string | null;
  archived?: boolean;
}

export function useKnowledgeBaseTags({ folderId, archived }: UseKnowledgeBaseTagsOptions = {}) {
  const data = useLazyLoadQuery<UseKnowledgeBaseTagsQueryType>(
    knowledgeBaseTagsQuery,
    { folderId: folderId ?? null, archived: archived ?? null },
    { fetchPolicy: 'store-and-network' },
  );
  return useMemo(() => data.knowledgeBaseTags.filter(Boolean), [data.knowledgeBaseTags]);
}
