'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useMemo } from 'react';
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay';
import type { useKnowledgeBaseTagsCreateMutation as UseKnowledgeBaseTagsCreateMutationType } from '@/__generated__/useKnowledgeBaseTagsCreateMutation.graphql';
import type { useKnowledgeBaseTagsDeleteMutation as UseKnowledgeBaseTagsDeleteMutationType } from '@/__generated__/useKnowledgeBaseTagsDeleteMutation.graphql';
import type { useKnowledgeBaseTagsQuery as UseKnowledgeBaseTagsQueryType } from '@/__generated__/useKnowledgeBaseTagsQuery.graphql';

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

const deleteKnowledgeBaseTagMutation = graphql`
  mutation useKnowledgeBaseTagsDeleteMutation($id: ID!) {
    deleteTag(id: $id)
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

export function useDeleteKnowledgeBaseTag() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseKnowledgeBaseTagsDeleteMutationType>(deleteKnowledgeBaseTagMutation);

  const deleteTag = useCallback(
    (id: string, onCompleted?: () => void) => {
      commit({
        variables: { id },
        updater: store => store.delete(id),
        onCompleted: () => onCompleted?.(),
        onError: err => {
          toast({
            title: 'Tag delete failed',
            description: err instanceof Error ? err.message : 'Unable to delete tag',
            variant: 'destructive',
          });
        },
      });
    },
    [commit, toast],
  );

  return { deleteTag, isPending: isInFlight };
}
