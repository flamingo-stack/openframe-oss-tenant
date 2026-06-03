'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type {
  UpdateArticleInput,
  useUpdateArticleMutation as UseUpdateArticleMutationType,
} from '@/__generated__/useUpdateArticleMutation.graphql';

const updateArticleMutation = graphql`
  mutation useUpdateArticleMutation($input: UpdateArticleInput!) {
    updateArticle(input: $input) {
      id
      name
      parentId
      content
      summary
      updatedAt
    }
  }
`;

interface UpdateArticleArgs {
  input: UpdateArticleInput;
  onCompleted?: () => void;
}

export function useUpdateArticle() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseUpdateArticleMutationType>(updateArticleMutation);

  const updateArticle = useCallback(
    ({ input, onCompleted }: UpdateArticleArgs) =>
      new Promise<void>((resolve, reject) => {
        commit({
          variables: { input },
          onCompleted: () => {
            onCompleted?.();
            resolve();
          },
          onError: err => {
            toast({
              title: 'Update failed',
              description: err instanceof Error ? err.message : 'Unable to update article',
              variant: 'destructive',
            });
            reject(err);
          },
        });
      }),
    [commit, toast],
  );

  return { updateArticle, isPending: isInFlight };
}
