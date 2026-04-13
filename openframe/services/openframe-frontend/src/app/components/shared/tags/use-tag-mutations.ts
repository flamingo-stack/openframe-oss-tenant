'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';

const createTagMutation = graphql`
  mutation useTagMutations_CreateTagMutation(
    $key: String!
    $entityType: String!
    $description: String
    $color: String
  ) {
    createTag(key: $key, entityType: $entityType, description: $description, color: $color) {
      id
      key
      description
      color
      entityType
      createdAt
    }
  }
`;

const updateTagMutation = graphql`
  mutation useTagMutations_UpdateTagMutation(
    $id: ID!
    $key: String
    $description: String
    $color: String
  ) {
    updateTag(id: $id, key: $key, description: $description, color: $color) {
      id
      key
      description
      color
      entityType
      createdAt
    }
  }
`;

const deleteTagMutation = graphql`
  mutation useTagMutations_DeleteTagMutation($id: ID!) {
    deleteTag(id: $id)
  }
`;

export function useCreateTagMutation() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation(createTagMutation);

  const createTag = useCallback(
    (
      variables: { key: string; entityType: string; description?: string; color?: string },
      onCompleted?: (id: string) => void,
    ) => {
      commit({
        variables,
        onCompleted: (response: any) => {
          onCompleted?.(response.createTag?.id);
        },
        onError: (error: Error) => {
          toast({ title: 'Error', description: error.message || 'Failed to create tag', variant: 'destructive' });
        },
      });
    },
    [commit, toast],
  );

  return { createTag, isInFlight };
}

export function useUpdateTagMutation() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation(updateTagMutation);

  const updateTag = useCallback(
    (variables: { id: string; key?: string; description?: string; color?: string }, onCompleted?: () => void) => {
      commit({
        variables,
        onCompleted: () => {
          onCompleted?.();
        },
        onError: (error: Error) => {
          toast({ title: 'Error', description: error.message || 'Failed to update tag', variant: 'destructive' });
        },
      });
    },
    [commit, toast],
  );

  return { updateTag, isInFlight };
}

export function useDeleteTagMutation() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation(deleteTagMutation);

  const deleteTag = useCallback(
    (id: string, onCompleted?: () => void) => {
      commit({
        variables: { id },
        onCompleted: () => {
          onCompleted?.();
        },
        onError: (error: Error) => {
          toast({ title: 'Error', description: error.message || 'Failed to delete tag', variant: 'destructive' });
        },
      });
    },
    [commit, toast],
  );

  return { deleteTag, isInFlight };
}
