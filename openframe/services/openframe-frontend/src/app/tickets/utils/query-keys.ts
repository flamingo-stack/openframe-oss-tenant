/**
 * Query keys for tickets/dialogs React Query hooks
 */

export interface DialogsQueryParams {
  archived: boolean;
  search?: string;
  statusFilters?: string[];
}

export const dialogsQueryKeys = {
  // Base key for all dialogs queries
  all: ['dialogs'] as const,

  // All list queries (paginated results)
  lists: () => [...dialogsQueryKeys.all, 'list'] as const,

  // Specific list query with parameters (no cursor — managed by useInfiniteQuery)
  list: (params: DialogsQueryParams) =>
    [
      ...dialogsQueryKeys.lists(),
      {
        archived: params.archived,
        search: params.search || '',
        statusFilters: params.statusFilters || [],
      },
    ] as const,
} as const;

/**
 * Utility to invalidate all dialogs queries
 */
export const invalidateAllDialogs = (queryClient: any) => {
  return queryClient.invalidateQueries({ queryKey: dialogsQueryKeys.all });
};

/**
 * Query keys for tickets React Query hooks
 */
export const ticketsQueryKeys = {
  all: ['tickets'] as const,
  labels: () => [...ticketsQueryKeys.all, 'labels'] as const,
  detail: (id: string) => [...ticketsQueryKeys.all, 'detail', id] as const,
  statistics: () => [...ticketsQueryKeys.all, 'statistics'] as const,
} as const;
