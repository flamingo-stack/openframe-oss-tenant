'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type { useUnpublishArticleMutation as UseUnpublishArticleMutationType } from '@/__generated__/useUnpublishArticleMutation.graphql';

const unpublishArticleMutation = graphql`
  mutation useUnpublishArticleMutation($id: ID!) {
    unpublishArticle(id: $id) {
      id
      status
      publishedAt
      updatedAt
    }
  }
`;

export function useUnpublishArticle() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseUnpublishArticleMutationType>(unpublishArticleMutation);

  const unpublishArticle = useCallback(
    (id: string) =>
      new Promise<void>((resolve, reject) => {
        commit({
          variables: { id },
          onCompleted: () => resolve(),
          onError: err => {
            toast({
              title: 'Unpublish failed',
              description: err instanceof Error ? err.message : 'Unable to unpublish article',
              variant: 'destructive',
            });
            reject(err);
          },
        });
      }),
    [commit, toast],
  );

  return { unpublishArticle, isPending: isInFlight };
}
