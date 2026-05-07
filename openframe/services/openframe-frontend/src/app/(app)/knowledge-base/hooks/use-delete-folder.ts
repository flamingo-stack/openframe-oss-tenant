'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';
import type { useDeleteFolderMutation as UseDeleteFolderMutationType } from '@/__generated__/useDeleteFolderMutation.graphql';
import { KNOWLEDGE_BASE_FOLDER_TREE_FIELD } from './use-knowledge-base-items';

const deleteFolderMutation = graphql`
  mutation useDeleteFolderMutation($input: DeleteFolderInput!) {
    deleteFolder(input: $input)
  }
`;

export type FolderChildrenAction = 'MOVE' | 'ARCHIVE';

interface DeleteFolderArgs {
  id: string;
  childrenAction: FolderChildrenAction;
  moveTargetFolderId?: string | null;
  connections: string[];
  onCompleted?: () => void;
}

export function useDeleteFolder() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseDeleteFolderMutationType>(deleteFolderMutation);

  const deleteFolder = useCallback(
    ({ id, childrenAction, moveTargetFolderId, connections, onCompleted }: DeleteFolderArgs) => {
      commit({
        variables: {
          input: {
            id,
            childrenAction,
            moveTargetFolderId: childrenAction === 'MOVE' ? (moveTargetFolderId ?? null) : null,
          },
        },
        updater: store => {
          for (const connectionId of connections) {
            const connection = store.get(connectionId);
            if (connection) {
              ConnectionHandler.deleteNode(connection, id);
            }
          }
          const root = store.getRoot();
          const existing = root.getLinkedRecords(KNOWLEDGE_BASE_FOLDER_TREE_FIELD);
          if (existing) {
            const next = existing.filter(record => record.getDataID() !== id);
            if (next.length !== existing.length) {
              root.setLinkedRecords(next, KNOWLEDGE_BASE_FOLDER_TREE_FIELD);
            }
          }
        },
        onCompleted: () => onCompleted?.(),
        onError: err => {
          toast({
            title: 'Delete failed',
            description: err instanceof Error ? err.message : 'Unable to delete folder',
            variant: 'destructive',
          });
        },
      });
    },
    [commit, toast],
  );

  return { deleteFolder, isPending: isInFlight };
}
