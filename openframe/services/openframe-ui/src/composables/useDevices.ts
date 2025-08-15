import { ref, computed } from '@vue/runtime-core';
import { GET_DEVICES } from '../graphql/queries';
import type { Machine, DeviceFilterInput, DeviceConnection } from '../types/graphql';

// Pagination state with page caching for consistent backward navigation
interface PageData {
  devices: Machine[];
  cursor: string;
  startCursor: string | null;
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PaginationState {
  pageCache: PageData[];        // Cache of actual page data for each page
  currentPageIndex: number;     // Current position in page cache
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function useDevices() {
  const devices = ref<Machine[]>([]);
  const loading = ref(true);
  const error = ref<Error | null>(null);
  const filter = ref<DeviceFilterInput>({});
  const limit = ref(20);
  const cursor = ref<string | null>(null);
  const search = ref<string>('');
  const filteredCount = ref(0);
  const hasNextPage = ref(false);
  const hasPreviousPage = ref(false);
  const startCursor = ref<string | null>(null);
  const endCursor = ref<string | null>(null);
  
  // Page caching for consistent backward navigation
  const paginationState = ref<PaginationState>({
    pageCache: [],                 // Start with empty cache
    currentPageIndex: 0,
    hasNextPage: true,
    hasPreviousPage: false
  });
  
  // Manual query function instead of useQuery to avoid double requests
  const executeQuery = async (queryCursor?: string | null) => {
    loading.value = true;
    error.value = null;
    
    try {
      const { default: client } = await import('@/apollo/apolloClient');
      const result = await client.query({
        query: GET_DEVICES,
        variables: {
          filter: filter.value,
          pagination: {
            limit: limit.value,
            cursor: queryCursor || cursor.value
          },
          search: search.value
        },
        fetchPolicy: 'no-cache'
      });
      
      if (result?.data?.devices) {
        const connection: DeviceConnection = result.data.devices;
        
        const pageDevices = connection.edges.map(edge => edge.node);
        const pageStartCursor = connection.pageInfo.startCursor || null;
        const pageEndCursor = connection.pageInfo.endCursor || null;
        
        // Update current display state
        devices.value = pageDevices;
        filteredCount.value = connection.filteredCount;
        hasNextPage.value = connection.pageInfo.hasNextPage;
        hasPreviousPage.value = connection.pageInfo.hasPreviousPage;
        startCursor.value = pageStartCursor;
        endCursor.value = pageEndCursor;
        cursor.value = queryCursor || cursor.value;
        
        // Cache this page data for backward navigation
        const pageData: PageData = {
          devices: pageDevices,
          cursor: queryCursor || '',
          startCursor: pageStartCursor,
          endCursor: pageEndCursor,
          hasNextPage: connection.pageInfo.hasNextPage,
          hasPreviousPage: paginationState.value.currentPageIndex > 0
        };
        
        // Update page cache
        if (paginationState.value.currentPageIndex >= paginationState.value.pageCache.length) {
          // Add new page to cache
          paginationState.value.pageCache.push(pageData);
        } else {
          // Update existing page in cache
          paginationState.value.pageCache[paginationState.value.currentPageIndex] = pageData;
        }
        
        // Update pagination state
        paginationState.value.hasNextPage = connection.pageInfo.hasNextPage;
        paginationState.value.hasPreviousPage = paginationState.value.currentPageIndex > 0;
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  };

  // Reset pagination state for new queries (filters, search changes)
  const resetPaginationState = () => {
    paginationState.value = {
      pageCache: [],                 // Clear page cache
      currentPageIndex: 0,
      hasNextPage: true,
      hasPreviousPage: false
    };
  };

  // Initial load
  const loadInitial = async () => {
    resetPaginationState();
    await executeQuery(null);
  };

  const refetch = async (
    newFilter?: DeviceFilterInput,
    newLimit?: number,
    newCursor?: string,
    newSearch?: string
  ) => {
    const hasFilterChanges = 
      (newFilter && JSON.stringify(newFilter) !== JSON.stringify(filter.value)) ||
      (newLimit && newLimit !== limit.value) ||
      (newSearch !== undefined && newSearch !== search.value);
    
    const hasCursorChange = newCursor !== cursor.value;
    const hasChanges = hasFilterChanges || hasCursorChange;

    if (hasChanges) {
      // Update local state
      if (newFilter) filter.value = newFilter;
      if (newLimit) limit.value = newLimit;
      if (newCursor !== undefined) cursor.value = newCursor;
      if (newSearch !== undefined) search.value = newSearch;
      
      // Reset pagination history when filters/search change (new query context)
      if (hasFilterChanges) {
        resetPaginationState();
        await executeQuery(null); // Start fresh with no cursor
      } else {
        await executeQuery(newCursor);
      }
    }
  };

  // Forward navigation with page caching
  const loadMore = async () => {
    if (!paginationState.value.hasNextPage || !endCursor.value) {
      return;
    }
    
    // Store current endCursor for next page
    const nextCursor = endCursor.value;
    
    // Move to next page
    paginationState.value.currentPageIndex++;
    
    // Check if we have this page cached
    if (paginationState.value.currentPageIndex < paginationState.value.pageCache.length) {
      // Use cached page data
      const cachedPage = paginationState.value.pageCache[paginationState.value.currentPageIndex];
      devices.value = cachedPage.devices;
      startCursor.value = cachedPage.startCursor;
      endCursor.value = cachedPage.endCursor;
      hasNextPage.value = cachedPage.hasNextPage;
      hasPreviousPage.value = cachedPage.hasPreviousPage;
      paginationState.value.hasNextPage = cachedPage.hasNextPage;
      paginationState.value.hasPreviousPage = cachedPage.hasPreviousPage;
    } else {
      // Execute query to fetch new page
      await executeQuery(nextCursor);
    }
  };

  // Backward navigation using cached page data
  const loadPrevious = async () => {
    if (paginationState.value.currentPageIndex <= 0) {
      return;
    }
    
    // Move to previous page
    paginationState.value.currentPageIndex--;
    
    // Use cached page data - guarantees identical page content
    const cachedPage = paginationState.value.pageCache[paginationState.value.currentPageIndex];
    
    // Restore cached page state
    devices.value = cachedPage.devices;
    startCursor.value = cachedPage.startCursor;
    endCursor.value = cachedPage.endCursor;
    hasNextPage.value = cachedPage.hasNextPage;
    hasPreviousPage.value = cachedPage.hasPreviousPage;
    cursor.value = cachedPage.cursor;
    
    // Update pagination state
    paginationState.value.hasNextPage = cachedPage.hasNextPage;
    paginationState.value.hasPreviousPage = paginationState.value.currentPageIndex > 0;
  };

  // Load initial data
  loadInitial();

  return {
    devices,
    loading,
    error,
    filter,
    limit,
    cursor,
    search,
    refetch,
    filteredCount,
    // Use client-side pagination state for navigation (industry standard)
    hasNextPage: computed(() => paginationState.value.hasNextPage),
    hasPreviousPage: computed(() => paginationState.value.hasPreviousPage),
    startCursor,
    endCursor,
    loadMore,
    loadPrevious,
    // Expose pagination state for debugging/monitoring
    currentPage: computed(() => paginationState.value.currentPageIndex + 1),
    totalPagesVisited: computed(() => paginationState.value.pageCache.length)
  };
} 