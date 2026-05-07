'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';
import type { useMoveToFolderMutation as UseMoveToFolderMutationType } from '@/__generated__/useMoveToFolderMutation.graphql';

const moveToFolderMutation = graphql`
  mutation useMoveToFolderMutation($id: ID!, $parentId: ID) {
    moveToFolder(id: $id, parentId: $parentId) {
      id
      parentId
      updatedAt
    }
  }
`;

interface MoveToFolderArgs {
  id: string;
  parentId: string | null;
  removeFromConnections: string[];
  appendToConnections?: string[];
  onCompleted?: () => void;
}

export function useMoveToFolder() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseMoveToFolderMutationType>(moveToFolderMutation);

  const moveToFolder = useCallback(
    ({ id, parentId, removeFromConnections, appendToConnections, onCompleted }: MoveToFolderArgs) =>
      new Promise<void>((resolve, reject) => {
        commit({
          variables: { id, parentId },
          updater: store => {
            for (const connectionId of removeFromConnections) {
              const connection = store.get(connectionId);
              if (connection) {
                ConnectionHandler.deleteNode(connection, id);
              }
            }
            if (appendToConnections?.length) {
              const moved = store.getRootField('moveToFolder');
              if (moved) {
                for (const connectionId of appendToConnections) {
                  const connection = store.get(connectionId);
                  if (!connection) continue;
                  const edge = ConnectionHandler.createEdge(store, connection, moved, 'KnowledgeBaseItemEdge');
                  ConnectionHandler.insertEdgeAfter(connection, edge);
                }
              }
            }
          },
          onCompleted: () => {
            onCompleted?.();
            resolve();
          },
          onError: err => {
            toast({
              title: 'Move failed',
              description: err instanceof Error ? err.message : 'Unable to move item',
              variant: 'destructive',
            });
            reject(err);
          },
        });
      }),
    [commit, toast],
  );

  return { moveToFolder, isPending: isInFlight };
}
