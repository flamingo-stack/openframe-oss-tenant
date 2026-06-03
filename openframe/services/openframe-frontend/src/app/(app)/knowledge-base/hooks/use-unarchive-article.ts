'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';
import type { useUnarchiveArticleMutation as UseUnarchiveArticleMutationType } from '@/__generated__/useUnarchiveArticleMutation.graphql';

const unarchiveArticleMutation = graphql`
  mutation useUnarchiveArticleMutation($id: ID!, $parentId: ID) {
    unarchiveArticle(id: $id, parentId: $parentId) {
      id
      status
      parentId
      updatedAt
    }
  }
`;

interface UnarchiveArticleArgs {
  id: string;
  parentId: string | null;
  removeFromConnections: string[];
  appendToConnections?: string[];
  onCompleted?: () => void;
}

export function useUnarchiveArticle() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseUnarchiveArticleMutationType>(unarchiveArticleMutation);

  const unarchiveArticle = useCallback(
    ({ id, parentId, removeFromConnections, appendToConnections, onCompleted }: UnarchiveArticleArgs) =>
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
              const unarchived = store.getRootField('unarchiveArticle');
              if (unarchived) {
                for (const connectionId of appendToConnections) {
                  const connection = store.get(connectionId);
                  if (!connection) continue;
                  const edge = ConnectionHandler.createEdge(store, connection, unarchived, 'KnowledgeBaseItemEdge');
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
              title: 'Unarchive failed',
              description: err instanceof Error ? err.message : 'Unable to unarchive article',
              variant: 'destructive',
            });
            reject(err);
          },
        });
      }),
    [commit, toast],
  );

  return { unarchiveArticle, isPending: isInFlight };
}
