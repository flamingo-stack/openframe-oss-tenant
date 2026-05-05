'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';
import type { useArchiveArticleMutation as UseArchiveArticleMutationType } from '@/__generated__/useArchiveArticleMutation.graphql';

const archiveArticleMutation = graphql`
  mutation useArchiveArticleMutation($id: ID!) {
    archiveArticle(id: $id) {
      id
      status
      parentId
      updatedAt
    }
  }
`;

interface ArchiveArticleArgs {
  id: string;
  removeFromConnections: string[];
  appendToConnections?: string[];
  onCompleted?: () => void;
}

export function useArchiveArticle() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseArchiveArticleMutationType>(archiveArticleMutation);

  const archiveArticle = useCallback(
    ({ id, removeFromConnections, appendToConnections, onCompleted }: ArchiveArticleArgs) =>
      new Promise<void>((resolve, reject) => {
        commit({
          variables: { id },
          updater: store => {
            for (const connectionId of removeFromConnections) {
              const connection = store.get(connectionId);
              if (connection) {
                ConnectionHandler.deleteNode(connection, id);
              }
            }
            if (appendToConnections?.length) {
              const archived = store.getRootField('archiveArticle');
              if (archived) {
                for (const connectionId of appendToConnections) {
                  const connection = store.get(connectionId);
                  if (!connection) continue;
                  const edge = ConnectionHandler.createEdge(store, connection, archived, 'KnowledgeBaseItemEdge');
                  ConnectionHandler.insertEdgeBefore(connection, edge);
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
              title: 'Archive failed',
              description: err instanceof Error ? err.message : 'Unable to archive article',
              variant: 'destructive',
            });
            reject(err);
          },
        });
      }),
    [commit, toast],
  );

  return { archiveArticle, isPending: isInFlight };
}
