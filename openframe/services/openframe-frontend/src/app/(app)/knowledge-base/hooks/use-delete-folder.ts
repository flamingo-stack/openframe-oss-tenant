'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';
import type { useDeleteFolderMutation as UseDeleteFolderMutationType } from '@/__generated__/useDeleteFolderMutation.graphql';

const deleteFolderMutation = graphql`
  mutation useDeleteFolderMutation($input: DeleteFolderInput!) {
    deleteFolder(input: $input)
  }
`;

export type FolderChildrenAction = 'MOVE' | 'ARCHIVE';

interface DeleteFolderArgs {
  id: string;
  childrenAction: FolderChildrenAction;
  /** Required when childrenAction === 'MOVE'. */
  moveTargetFolderId?: string | null;
  /** Connection IDs to drop the deleted folder from (typically the parent folder's items connection). */
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
