'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type { useCreateFolderMutation as UseCreateFolderMutationType } from '@/__generated__/useCreateFolderMutation.graphql';
import { KNOWLEDGE_BASE_FOLDER_TREE_FIELD } from './use-knowledge-base-items';

const createFolderMutation = graphql`
  mutation useCreateFolderMutation($name: String!, $parentId: ID, $connections: [ID!]!) {
    createFolder(name: $name, parentId: $parentId)
      @appendNode(connections: $connections, edgeTypeName: "KnowledgeBaseItemEdge") {
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
          updater: store => {
            const created = store.getRootField('createFolder');
            if (!created) return;
            const root = store.getRoot();
            const existing = root.getLinkedRecords(KNOWLEDGE_BASE_FOLDER_TREE_FIELD);
            if (!existing) return;
            if (existing.some(record => record.getDataID() === created.getDataID())) return;
            root.setLinkedRecords([...existing, created], KNOWLEDGE_BASE_FOLDER_TREE_FIELD);
          },
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
