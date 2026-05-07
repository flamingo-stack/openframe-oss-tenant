'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay';
import type { useKnowledgeBaseTagsCreateMutation as UseKnowledgeBaseTagsCreateMutationType } from '@/__generated__/useKnowledgeBaseTagsCreateMutation.graphql';
import type { useKnowledgeBaseTagsQuery as UseKnowledgeBaseTagsQueryType } from '@/__generated__/useKnowledgeBaseTagsQuery.graphql';

export const knowledgeBaseTagsQuery = graphql`
  query useKnowledgeBaseTagsQuery($folderId: ID) {
    knowledgeBaseTags(folderId: $folderId) {
      id
      key
      color
      description
    }
  }
`;

const createKnowledgeBaseTagMutation = graphql`
  mutation useKnowledgeBaseTagsCreateMutation($key: String!, $color: String) {
    createTag(key: $key, entityType: "KNOWLEDGE_ARTICLE", color: $color) {
      id
      key
      color
      description
      entityType
      createdAt
    }
  }
`;

export type KnowledgeBaseTag = UseKnowledgeBaseTagsQueryType['response']['knowledgeBaseTags'][number];

export function useKnowledgeBaseTags(folderId?: string | null) {
  const data = useLazyLoadQuery<UseKnowledgeBaseTagsQueryType>(
    knowledgeBaseTagsQuery,
    { folderId: folderId ?? null },
    { fetchPolicy: 'store-or-network' },
  );
  return data.knowledgeBaseTags;
}

export function useCreateKnowledgeBaseTag() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseKnowledgeBaseTagsCreateMutationType>(createKnowledgeBaseTagMutation);

  const createTag = useCallback(
    (key: string, color?: string) =>
      new Promise<{ id: string; key: string }>((resolve, reject) => {
        commit({
          variables: { key, color: color ?? null },
          onCompleted: response => {
            const created = response.createTag;
            if (!created) {
              reject(new Error('Tag creation returned no data'));
              return;
            }
            resolve({ id: created.id, key: created.key });
          },
          onError: err => {
            toast({
              title: 'Tag creation failed',
              description: err instanceof Error ? err.message : 'Unable to create tag',
              variant: 'destructive',
            });
            reject(err);
          },
        });
      }),
    [commit, toast],
  );

  return { createTag, isPending: isInFlight };
}
