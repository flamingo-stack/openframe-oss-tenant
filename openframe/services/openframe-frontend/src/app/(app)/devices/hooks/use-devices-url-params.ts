'use client';

import type { TagSearchOption } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useMemo } from 'react';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { DEFAULT_DEVICES_LIST_STATUSES } from '../constants/device-statuses';
import type { DeviceFilterInput } from '../types/device.types';

interface UseDevicesUrlParamsOptions {
  /**
   * Default statuses applied when the user hasn't picked any.
   * - omitted → `DEFAULT_DEVICES_LIST_STATUSES` (ONLINE / OFFLINE; PENDING is
   *   opt-in via the filter, ARCHIVED lives on /devices/archive, DELETED
   *   hidden). Used on the main Devices page and the Customer devices tab.
   * - `[]` → no default, every status (including ARCHIVED / DELETED) returned;
   *   pair with `lockedFilters` to scope the query (e.g. the archive page).
   */
  defaultStatuses?: string[];
}

export function useDevicesUrlParams(options: UseDevicesUrlParamsOptions = {}) {
  const defaultStatuses = options.defaultStatuses ?? DEFAULT_DEVICES_LIST_STATUSES;

  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    statuses: { type: 'array', default: [] },
    osTypes: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
    tags: { type: 'array', default: [] },
    viewMode: { type: 'string', default: 'table' },
  });

  // Local search keeps typing responsive; the shared hook debounces it to the
  // URL param and guards the back/forward sync-down against clobbering typing.
  const {
    search: localSearch,
    setSearch: setLocalSearch,
    debouncedSearch,
  } = useSearchParam(params.search, value => setParam('search', value), 500);

  // Only "key:value" pairs go to the API
  const tagValues = useMemo(
    () =>
      params.tags.flatMap(tag => {
        const i = tag.indexOf(':');
        return i > 0 ? [tag.substring(i + 1)] : [];
      }),
    [params.tags],
  );

  // Selecting exactly the default status set is the same as no selection —
  // collapse it to [] so the URL stays clean (`?statuses=` is dropped) and it
  // never reads as an active filter. Applied on both read (a URL that spells
  // out the defaults) and write (Apply with all defaults checked).
  const normalizeStatuses = useCallback(
    (statuses: string[]) =>
      statuses.length === defaultStatuses.length && defaultStatuses.every(s => statuses.includes(s)) ? [] : statuses,
    [defaultStatuses],
  );

  const selectedStatuses = useMemo(() => normalizeStatuses(params.statuses), [params.statuses, normalizeStatuses]);

  const normalizedParams = useMemo(() => ({ ...params, statuses: selectedStatuses }), [params, selectedStatuses]);

  const setParamsNormalized = useCallback(
    (next: Record<string, any>) =>
      setParams('statuses' in next ? { ...next, statuses: normalizeStatuses(next.statuses || []) } : next),
    [setParams, normalizeStatuses],
  );

  // When the user hasn't explicitly picked statuses, the QUERY falls back to the
  // defaults (online/offline). This is query-only: the filter UI shows just the
  // explicit selection (`selectedStatuses`), so nothing looks checked in the
  // default state.
  const effectiveStatuses = useMemo(
    () => (selectedStatuses.length > 0 ? selectedStatuses : defaultStatuses),
    [selectedStatuses, defaultStatuses],
  );

  const filters: DeviceFilterInput = useMemo(
    () => ({
      ...(effectiveStatuses.length > 0 && { statuses: effectiveStatuses }),
      osTypes: params.osTypes,
      organizationIds: params.organizationIds,
      ...(tagValues.length > 0 && { tagValues }),
    }),
    [effectiveStatuses, params.osTypes, params.organizationIds, tagValues],
  );

  const tableFilters = useMemo(
    () => ({
      status: selectedStatuses,
      os: params.osTypes,
      organization: params.organizationIds,
    }),
    [selectedStatuses, params.osTypes, params.organizationIds],
  );

  const tagOptions: TagSearchOption<string>[] = useMemo(
    () => params.tags.map(tag => ({ label: tag, value: tag })),
    [params.tags],
  );

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, any[]>) => {
      setParamsNormalized({
        statuses: columnFilters.status || [],
        osTypes: columnFilters.os || [],
        organizationIds: columnFilters.organization || [],
      });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParamsNormalized],
  );

  const handleTagRemove = useCallback(
    (value: string) => {
      setParam(
        'tags',
        params.tags.filter(t => t !== value),
      );
    },
    [params.tags, setParam],
  );

  const handleClearAll = useCallback(() => {
    setLocalSearch('');
    setParams({ tags: [], search: '' });
  }, [setParams, setLocalSearch]);

  const handleTagSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && !params.tags.includes(trimmed)) {
        setParam('tags', [...params.tags, trimmed]);
        setLocalSearch('');
        setParam('search', '');
      }
    },
    [params.tags, setParam, setLocalSearch],
  );

  return {
    params: normalizedParams,
    setParam,
    setParams: setParamsNormalized,
    localSearch,
    setLocalSearch,
    debouncedSearch,
    filters,
    tableFilters,
    tagOptions,
    handleFilterChange,
    handleTagRemove,
    handleClearAll,
    handleTagSubmit,
  };
}
