/**
 * Query keys for tickets/dialogs React Query hooks
 */

export interface DialogsQueryParams {
  archived: boolean;
  search?: string;
  statusFilters?: string[];
  cursor?: string;
}

export const dialogsQueryKeys = {
  // Base key for all dialogs queries
  all: ['dialogs'] as const,

  // All list queries (paginated results)
  lists: () => [...dialogsQueryKeys.all, 'list'] as const,

  // Specific list query with parameters
  list: (params: DialogsQueryParams) =>
    [
      ...dialogsQueryKeys.lists(),
      {
        archived: params.archived,
        search: params.search || '',
        statusFilters: params.statusFilters || [],
        cursor: params.cursor || '',
      },
    ] as const,
} as const;

/**
 * Utility to invalidate all dialogs queries
 */
export const invalidateAllDialogs = (queryClient: any) => {
  return queryClient.invalidateQueries({ queryKey: dialogsQueryKeys.all });
};
