'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type { useRemoveTagMutation as UseRemoveTagMutationType } from '@/__generated__/useRemoveTagMutation.graphql';

const removeTagMutation = graphql`
  mutation useRemoveTagMutation($itemId: ID!, $tagId: ID!) {
    removeTagFromKnowledgeBaseItem(itemId: $itemId, tagId: $tagId) {
      id
      tags {
        id
        key
        color
      }
    }
  }
`;

export function useRemoveTag() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseRemoveTagMutationType>(removeTagMutation);

  const removeTag = useCallback(
    (itemId: string, tagId: string) =>
      new Promise<void>((resolve, reject) => {
        commit({
          variables: { itemId, tagId },
          onCompleted: () => resolve(),
          onError: err => {
            toast({
              title: 'Remove tag failed',
              description: err instanceof Error ? err.message : 'Unable to remove tag',
              variant: 'destructive',
            });
            reject(err);
          },
        });
      }),
    [commit, toast],
  );

  return { removeTag, isPending: isInFlight };
}
