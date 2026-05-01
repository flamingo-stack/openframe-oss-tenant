'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type { useCreateFolderMutation as UseCreateFolderMutationType } from '@/__generated__/useCreateFolderMutation.graphql';

const createFolderMutation = graphql`
  mutation useCreateFolderMutation($name: String!, $parentId: ID, $connections: [ID!]!) {
    createFolder(name: $name, parentId: $parentId)
      @appendEdge(connections: $connections, edgeTypeName: "KnowledgeBaseItemEdge") {
      id
      type
      name
      parentId
      createdAt
      updatedAt
    }
  }
`;

interface CreateFolderArgs {
  name: string;
  parentId: string | null;
  connections: string[];
}

export function useCreateFolder() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseCreateFolderMutationType>(createFolderMutation);

  const createFolder = useCallback(
    ({ name, parentId, connections }: CreateFolderArgs) =>
      new Promise<{ id: string }>((resolve, reject) => {
        commit({
          variables: { name, parentId, connections },
          onCompleted: response => {
            if (response.createFolder?.id) {
              resolve({ id: response.createFolder.id });
            } else {
              reject(new Error('Folder creation returned no data'));
            }
          },
          onError: err => {
            toast({
              title: 'Create folder failed',
              description: err instanceof Error ? err.message : 'Unable to create folder',
              variant: 'destructive',
            });
            reject(err);
          },
        });
      }),
    [commit, toast],
  );

  return { createFolder, isPending: isInFlight };
}
