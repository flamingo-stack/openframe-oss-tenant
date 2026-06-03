'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type { usePublishArticleMutation as UsePublishArticleMutationType } from '@/__generated__/usePublishArticleMutation.graphql';

const publishArticleMutation = graphql`
  mutation usePublishArticleMutation($id: ID!) {
    publishArticle(id: $id) {
      id
      status
      publishedAt
      updatedAt
    }
  }
`;

export function usePublishArticle() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UsePublishArticleMutationType>(publishArticleMutation);

  const publishArticle = useCallback(
    (id: string) =>
      new Promise<void>((resolve, reject) => {
        commit({
          variables: { id },
          onCompleted: () => resolve(),
          onError: err => {
            toast({
              title: 'Publish failed',
              description: err instanceof Error ? err.message : 'Unable to publish article',
              variant: 'destructive',
            });
            reject(err);
          },
        });
      }),
    [commit, toast],
  );

  return { publishArticle, isPending: isInFlight };
}
