'use client';

import { useMdUp } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { DeviceFilters } from '../types/device.types';

function isCompleteTag(tag: string): boolean {
  const i = tag.indexOf(':');
  return i > 0 && i < tag.length - 1;
}

interface UseTagFilterModalParams {
  tags: string[];
  deviceFilters: DeviceFilters | null;
  columns: Array<{ key: string; label: string; filterable?: boolean; filterOptions?: any[] }>;
  setParams: (params: Record<string, any>) => void;
}

export function useTagFilterModal({ tags, deviceFilters, columns, setParams }: UseTagFilterModalParams) {
  const isMdUp = useMdUp();
  const [isOpen, setIsOpen] = useState(false);

  // FilterModal calls onFilterChange first, then onTagsChange.
  // We buffer column filters in a ref so onTagsChange can flush everything in one setParams call.
  const pendingFiltersRef = useRef<Record<string, any[]>>({});

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const filterGroups = useMemo(() => {
    if (isMdUp) return [];
    return columns
      .filter(column => column.filterable)
      .map(column => ({
        id: column.key,
        title: column.label,
        options: column.filterOptions || [],
      }));
  }, [columns, isMdUp]);

  const tagFilterKeys = useMemo(() => {
    if (!deviceFilters?.tagKeys) return [];
    const grouped = new Map<string, { id: string; label: string; count?: number }[]>();
    for (const tag of deviceFilters.tagKeys) {
      if (tag.key === 'null') continue;
      if (!grouped.has(tag.key)) {
        grouped.set(tag.key, []);
      }
      if (tag.value !== 'null') {
        grouped.get(tag.key)!.push({ id: tag.value, label: tag.value, count: tag.count });
      }
    }
    return Array.from(grouped, ([key, values]) => ({ key, label: key, values }));
  }, [deviceFilters?.tagKeys]);

  // Step 1: buffer column filters (called first by FilterModal)
  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    pendingFiltersRef.current = columnFilters;
  }, []);

  // Step 2: combine with buffered filters and flush (called second by FilterModal)
  const handleTagsChange = useCallback(
    (newTags: string[]) => {
      const cf = pendingFiltersRef.current;
      setParams({
        statuses: cf.status || [],
        osTypes: cf.os || [],
        organizationIds: cf.organization || [],
        tags: newTags.filter(isCompleteTag),
      });
      pendingFiltersRef.current = {};
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParams],
  );

  return {
    isOpen,
    open,
    close,
    isMdUp,
    filterGroups,
    tagFilterKeys,
    handleFilterChange,
    handleTagsChange,
    selectedTags: tags,
  };
}
