'use client';

import type { TagSearchOption } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_DEVICES_LIST_STATUSES } from '../constants/device-statuses';
import type { DeviceFilterInput } from '../types/device.types';

export function useDevicesUrlParams() {
  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    statuses: { type: 'array', default: [] },
    osTypes: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
    tags: { type: 'array', default: [] },
    viewMode: { type: 'string', default: 'table' },
  });

  const [localSearch, setLocalSearch] = useState(params.search);
  const debouncedSearch = useDebounce(localSearch, 500);

  // Ref to avoid infinite loop — setParam identity changes on every URL update
  const setParamRef = useRef(setParam);
  setParamRef.current = setParam;

  // Sync debounced value to URL param
  useEffect(() => {
    setParamRef.current('search', debouncedSearch);
  }, [debouncedSearch]);

  // Only "key:value" pairs go to the API
  const tagValues = useMemo(
    () =>
      params.tags.flatMap(tag => {
        const i = tag.indexOf(':');
        return i > 0 ? [tag.substring(i + 1)] : [];
      }),
    [params.tags],
  );

  const filters: DeviceFilterInput = useMemo(
    () => ({
      statuses: params.statuses.length > 0 ? params.statuses : DEFAULT_DEVICES_LIST_STATUSES,
      osTypes: params.osTypes,
      organizationIds: params.organizationIds,
      ...(tagValues.length > 0 && { tagValues }),
    }),
    [params.statuses, params.osTypes, params.organizationIds, tagValues],
  );

  const tableFilters = useMemo(
    () => ({
      status: params.statuses,
      os: params.osTypes,
      organization: params.organizationIds,
    }),
    [params.statuses, params.osTypes, params.organizationIds],
  );

  const tagOptions: TagSearchOption<string>[] = useMemo(
    () => params.tags.map(tag => ({ label: tag, value: tag })),
    [params.tags],
  );

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, any[]>) => {
      setParams({
        statuses: columnFilters.status || [],
        osTypes: columnFilters.os || [],
        organizationIds: columnFilters.organization || [],
      });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParams],
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
  }, [setParams]);

  const handleTagSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && !params.tags.includes(trimmed)) {
        setParam('tags', [...params.tags, trimmed]);
        setLocalSearch('');
        setParam('search', '');
      }
    },
    [params.tags, setParam],
  );

  return {
    params,
    setParam,
    setParams,
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
