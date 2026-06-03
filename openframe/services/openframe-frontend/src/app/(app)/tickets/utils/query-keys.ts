/**
 * Query keys for tickets/dialogs React Query hooks
 */

export interface DialogsQueryParams {
  archived: boolean;
  search?: string;
  statusFilters?: string[];
  organizationIds?: string[];
  assigneeIds?: string[];
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
        organizationIds: params.organizationIds || [],
        assigneeIds: params.assigneeIds || [],
      },
    ] as const,

  // All board column queries (one infinite query per status)
  boardColumns: () => [...dialogsQueryKeys.all, 'boardColumn'] as const,

  // Specific board column keyed by status + search + filters
  boardColumn: (status: string, params: { search?: string; organizationIds?: string[]; assigneeIds?: string[] }) =>
    [
      ...dialogsQueryKeys.boardColumns(),
      status,
      {
        search: params.search || '',
        organizationIds: params.organizationIds || [],
        assigneeIds: params.assigneeIds || [],
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
  statusTransitions: () => [...ticketsQueryKeys.all, 'statusTransitions'] as const,
} as const;
