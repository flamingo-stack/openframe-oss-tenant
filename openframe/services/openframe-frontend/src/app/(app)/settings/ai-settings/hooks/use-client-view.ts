'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  GET_CLIENT_VIEW_QUERY,
  RESET_CLIENT_VIEW_MUTATION,
  UPDATE_CLIENT_VIEW_MUTATION,
} from '../queries/ai-settings-queries';
import type { ApplicationTheme, ClientView, ClientViewInput } from '../types/ai-settings';

export const clientViewQueryKeys = {
  detail: (organizationId: string | null) => ['client-view', { organizationId }] as const,
};

interface ClientViewGql {
  id: string;
  organizationId: string | null;
  assistantName: string;
  assistantAvatar: { imageUrl: string; hash: string | null } | null;
  applicationTheme: ApplicationTheme;
  accentColor: string;
  createdAt: string;
  updatedAt: string | null;
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

function toClientView(raw: ClientViewGql): ClientView {
  return {
    id: raw.id,
    organizationId: raw.organizationId ?? null,
    assistantName: raw.assistantName,
    assistantAvatar: raw.assistantAvatar
      ? { imageUrl: raw.assistantAvatar.imageUrl, hash: raw.assistantAvatar.hash ?? undefined }
      : null,
    applicationTheme: raw.applicationTheme,
    accentColor: raw.accentColor,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
  };
}

interface UseClientViewOptions {
  enabled?: boolean;
}

/**
 * Client assistant appearance. `organizationId` omitted/null loads the
 * tenant-wide default; a set id loads that org's override. `view` is null when
 * no record exists yet.
 */
export function useClientView(organizationId: string | null = null, { enabled = true }: UseClientViewOptions = {}) {
  const result = useQuery({
    queryKey: clientViewQueryKeys.detail(organizationId),
    queryFn: async (): Promise<ClientView | null> => {
      const response = await apiClient.post<GraphqlResponse<{ clientView: ClientViewGql | null }>>('/chat/graphql', {
        query: GET_CLIENT_VIEW_QUERY,
        variables: { organizationId },
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Failed to load client view');
      }
      if (response.data.errors?.length) {
        throw new Error(response.data.errors.map(e => e.message).join(', '));
      }

      const raw = response.data.data?.clientView;
      return raw ? toClientView(raw) : null;
    },
    enabled,
  });

  return { view: result.data ?? null, isLoading: result.isLoading, error: result.error, refetch: result.refetch };
}

/**
 * Returns `mutateAsync` so the CLIENT screen can save the view alongside the AI
 * config and surface a single combined toast. Feedback is owned by the caller.
 */
export function useUpdateClientView(
  organizationId: string | null = null,
  { invalidateOnSuccess = true }: { invalidateOnSuccess?: boolean } = {},
) {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationFn: async (input: ClientViewInput): Promise<ClientView | null> => {
      const response = await apiClient.post<
        GraphqlResponse<{ updateClientView: { view: ClientViewGql | null; userErrors: { message: string }[] } }>
      >('/chat/graphql', { query: UPDATE_CLIENT_VIEW_MUTATION, variables: { organizationId, input } });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Failed to save client view');
      }
      if (response.data.errors?.length) {
        throw new Error(response.data.errors.map(e => e.message).join(', '));
      }

      const result = response.data.data?.updateClientView;
      const userErrors = result?.userErrors ?? [];
      if (userErrors.length > 0) {
        throw new Error(userErrors.map(e => e.message).join(', '));
      }

      // Return the saved view so the caller can attach the avatar to its id.
      return result?.view ? toClientView(result.view) : null;
    },
    onSuccess: () => {
      // The customer screen attaches the avatar after this resolves, then
      // invalidates once itself — auto-invalidating here would refetch the
      // pre-upload avatar and flicker the preview, so it opts out.
      if (invalidateOnSuccess) {
        queryClient.invalidateQueries({ queryKey: clientViewQueryKeys.detail(organizationId) });
      }
    },
  });

  return { update: result.mutateAsync, isPending: result.isPending };
}

/**
 * Deletes the per-organization appearance override so the customer reverts to
 * the tenant-wide default. Feedback is owned by the caller. Requires the backend
 * `resetClientView(organizationId: ID!)` mutation.
 */
export function useResetClientView(organizationId: string) {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<
        GraphqlResponse<{ resetClientView: { userErrors: { message: string }[] } }>
      >('/chat/graphql', { query: RESET_CLIENT_VIEW_MUTATION, variables: { organizationId } });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Failed to reset client view');
      }
      if (response.data.errors?.length) {
        throw new Error(response.data.errors.map(e => e.message).join(', '));
      }

      const userErrors = response.data.data?.resetClientView.userErrors ?? [];
      if (userErrors.length > 0) {
        throw new Error(userErrors.map(e => e.message).join(', '));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientViewQueryKeys.detail(organizationId) });
    },
  });

  return { reset: result.mutateAsync, isPending: result.isPending };
}
