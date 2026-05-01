'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type { useRenameFolderMutation as UseRenameFolderMutationType } from '@/__generated__/useRenameFolderMutation.graphql';

const renameFolderMutation = graphql`
  mutation useRenameFolderMutation($id: ID!, $name: String!) {
    renameFolder(id: $id, name: $name) {
      id
      name
      updatedAt
    }
  }
`;

interface RenameFolderArgs {
  id: string;
  name: string;
  onCompleted?: () => void;
}

export function useRenameFolder() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseRenameFolderMutationType>(renameFolderMutation);

  const renameFolder = useCallback(
    ({ id, name, onCompleted }: RenameFolderArgs) => {
      commit({
        variables: { id, name },
        onCompleted: () => onCompleted?.(),
        onError: err => {
          toast({
            title: 'Rename failed',
            description: err instanceof Error ? err.message : 'Unable to rename folder',
            variant: 'destructive',
          });
        },
      });
    },
    [commit, toast],
  );

  return { renameFolder, isPending: isInFlight };
}
