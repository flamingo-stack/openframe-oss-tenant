'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type {
  CreateArticleInput,
  useCreateArticleMutation as UseCreateArticleMutationType,
} from '@/__generated__/useCreateArticleMutation.graphql';

const createArticleMutation = graphql`
  mutation useCreateArticleMutation($input: CreateArticleInput!, $connections: [ID!]!) {
    createArticle(input: $input)
      @appendNode(connections: $connections, edgeTypeName: "KnowledgeBaseItemEdge") {
      id
      type
      name
      parentId
      summary
      content
      status
      publishedAt
      createdAt
      updatedAt
      author {
        id
        firstName
        lastName
        email
      }
      tags {
        id
        key
        color
      }
    }
  }
`;

interface CreateArticleArgs {
  input: CreateArticleInput;
  connections: string[];
}

export function useCreateArticle() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseCreateArticleMutationType>(createArticleMutation);

  const createArticle = useCallback(
    ({ input, connections }: CreateArticleArgs) =>
      new Promise<{ id: string }>((resolve, reject) => {
        commit({
          variables: { input, connections },
          onCompleted: response => {
            if (response.createArticle?.id) {
              resolve({ id: response.createArticle.id });
            } else {
              reject(new Error('Article creation returned no data'));
            }
          },
          onError: err => {
            toast({
              title: 'Create article failed',
              description: err instanceof Error ? err.message : 'Unable to create article',
              variant: 'destructive',
            });
            reject(err);
          },
        });
      }),
    [commit, toast],
  );

  return { createArticle, isPending: isInFlight };
}
