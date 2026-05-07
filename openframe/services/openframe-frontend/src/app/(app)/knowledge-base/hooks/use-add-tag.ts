'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type { useAddTagMutation as UseAddTagMutationType } from '@/__generated__/useAddTagMutation.graphql';

const addTagMutation = graphql`
  mutation useAddTagMutation($itemId: ID!, $tagId: ID!) {
    addTagToKnowledgeBaseItem(itemId: $itemId, tagId: $tagId) {
      id
      tags {
        id
        key
        color
      }
    }
  }
`;

export function useAddTag() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseAddTagMutationType>(addTagMutation);

  const addTag = useCallback(
    (itemId: string, tagId: string) =>
      new Promise<void>((resolve, reject) => {
        commit({
          variables: { itemId, tagId },
          onCompleted: () => resolve(),
          onError: err => {
            toast({
              title: 'Add tag failed',
              description: err instanceof Error ? err.message : 'Unable to add tag',
              variant: 'destructive',
            });
            reject(err);
          },
        });
      }),
    [commit, toast],
  );

  return { addTag, isPending: isInFlight };
}
