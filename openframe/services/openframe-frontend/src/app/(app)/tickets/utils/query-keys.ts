/**
 * Query keys for tickets/dialogs React Query hooks
 */

export interface DialogsQueryParams {
  archived: boolean;
  search?: string;
  statusFilters?: string[];
  statusIds?: string[];
  organizationIds?: string[];
  assigneeIds?: string[];
  labelIds?: string[];
  /** Page size override (default 20). Part of the query key — lists fetched
   *  with different page sizes must not share a cache entry. */
  pageSize?: number;
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
        statusIds: params.statusIds || [],
        organizationIds: params.organizationIds || [],
        assigneeIds: params.assigneeIds || [],
        labelIds: params.labelIds || [],
        pageSize: params.pageSize ?? 20,
      },
    ] as const,

  // All board column queries (one infinite query per status), keyed by statusId.
  boardColumns: () => [...dialogsQueryKeys.all, 'boardColumn'] as const,

  // Specific board column keyed by statusId + search + filters
  boardColumn: (
    statusId: string,
    params: { search?: string; organizationIds?: string[]; assigneeIds?: string[]; labelIds?: string[] },
  ) =>
    [
      ...dialogsQueryKeys.boardColumns(),
      statusId,
      {
        search: params.search || '',
        organizationIds: params.organizationIds || [],
        assigneeIds: params.assigneeIds || [],
        labelIds: params.labelIds || [],
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
  // Edit-form ticket fetch. Distinct from `detail` (which caches a Dialog) so the
  // full Ticket shape (statusDefinition, availableTransitions) isn't clobbered by — or read from — the Dialog cache.
  editForm: (id: string) => [...ticketsQueryKeys.all, 'editForm', id] as const,
  statistics: () => [...ticketsQueryKeys.all, 'statistics'] as const,
  statusTransitions: () => [...ticketsQueryKeys.all, 'statusTransitions'] as const,
  statusTransitionRules: () => [...ticketsQueryKeys.all, 'statusTransitionRules'] as const,
  statuses: () => [...ticketsQueryKeys.all, 'statuses'] as const,
} as const;
