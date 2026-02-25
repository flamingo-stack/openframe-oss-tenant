'use client';

import {
  OSTypeBadgeGroup,
  type ShellType,
  ShellTypeBadge,
  ToolBadge,
} from '@flamingo-stack/openframe-frontend-core/components';
import { PlayIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  ListPageLayout,
  MoreActionsMenu,
  Table,
  type TableColumn,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce, useTablePagination } from '@flamingo-stack/openframe-frontend-core/hooks';
import { getOSLabel, normalizeToolTypeWithFallback, toToolLabel } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useScripts } from '../hooks/use-scripts';

interface UiScriptEntry {
  id: number;
  name: string;
  description: string;
  shellType: string;
  addedBy: string;
  supportedPlatforms: string[];
  category: string;
  timeout: number;
}

/**
 * Scripts table
 */
export function ScriptsTable() {
  const router = useRouter();

  // URL state management - search, filters, and pagination persist in URL
  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    shellType: { type: 'array', default: [] },
    addedBy: { type: 'array', default: [] },
    category: { type: 'array', default: [] },
    supportedPlatforms: { type: 'array', default: [] },
    page: { type: 'number', default: 1 },
  });
  const pageSize = 10;

  // Local state for debounced input
  const [searchInput, setSearchInput] = useState(params.search);
  const debouncedSearchInput = useDebounce(searchInput, 300);

  // Sync debounced search to URL (only when value actually changed)
  useEffect(() => {
    if (debouncedSearchInput !== params.search) {
      setParam('search', debouncedSearchInput);
    }
  }, [debouncedSearchInput, params.search, setParam]);

  const { scripts, isLoading, error } = useScripts();

  const transformedScripts: UiScriptEntry[] = useMemo(() => {
    return scripts.map(script => ({
      id: script.id,
      name: script.name,
      description: script.description,
      shellType: script.shell,
      addedBy: normalizeToolTypeWithFallback('tactical'),
      supportedPlatforms: script.supported_platforms || [],
      category: script.category || 'General',
      timeout: script.default_timeout || 300,
    }));
  }, [scripts]);

  const uniqueShellTypes = useMemo(() => {
    const shellTypesSet = new Set(transformedScripts.map(script => script.shellType));
    return Array.from(shellTypesSet)
      .sort()
      .map(shellType => ({
        id: shellType,
        label: shellType,
        value: shellType,
      }));
  }, [transformedScripts]);

  const uniqueAddedBy = useMemo(() => {
    const addedBySet = new Set(transformedScripts.map(script => script.addedBy));
    return Array.from(addedBySet)
      .sort()
      .map(toolType => ({
        id: toolType,
        label: toToolLabel(toolType.toUpperCase()),
        value: toolType,
      }));
  }, [transformedScripts]);

  const uniqueCategories = useMemo(() => {
    const categoriesSet = new Set(transformedScripts.map(script => script.category));
    return Array.from(categoriesSet)
      .sort()
      .map(category => ({
        id: category,
        label: category,
        value: category,
      }));
  }, [transformedScripts]);

  const uniquePlatforms = useMemo(() => {
    const platformsSet = new Set(transformedScripts.flatMap(script => script.supportedPlatforms));
    return Array.from(platformsSet)
      .sort()
      .map(platform => ({
        id: platform,
        label: getOSLabel(platform),
        value: platform,
      }));
  }, [transformedScripts]);

  const filteredScripts = useMemo(() => {
    let filtered = transformedScripts;

    if (params.search && params.search.trim() !== '') {
      const searchLower = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        script =>
          script.name.toLowerCase().includes(searchLower) || script.description.toLowerCase().includes(searchLower),
      );
    }

    if (params.shellType && params.shellType.length > 0) {
      filtered = filtered.filter(script => params.shellType.includes(script.shellType));
    }

    if (params.addedBy && params.addedBy.length > 0) {
      filtered = filtered.filter(script => params.addedBy.includes(script.addedBy));
    }

    if (params.category && params.category.length > 0) {
      filtered = filtered.filter(script => params.category.includes(script.category));
    }

    if (params.supportedPlatforms && params.supportedPlatforms.length > 0) {
      filtered = filtered.filter(script =>
        script.supportedPlatforms.some(platform => params.supportedPlatforms.includes(platform)),
      );
    }

    return filtered;
  }, [transformedScripts, params.search, params.shellType, params.addedBy, params.category, params.supportedPlatforms]);

  const paginatedScripts = useMemo(() => {
    const startIndex = (params.page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredScripts.slice(startIndex, endIndex);
  }, [filteredScripts, params.page]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredScripts.length / pageSize);
  }, [filteredScripts.length]);

  const columns: TableColumn<UiScriptEntry>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        renderCell: script => (
          <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary overflow-x-hidden whitespace-nowrap text-ellipsis">
            {script.name}
          </span>
        ),
      },
      {
        key: 'shellType',
        label: 'Shell Type',
        width: 'w-[160px]',
        hideAt: 'sm',
        filterable: true,
        filterOptions: uniqueShellTypes,
        renderCell: script => <ShellTypeBadge shellType={script.shellType as ShellType} />,
      },
      {
        key: 'supportedPlatforms',
        label: 'OS',
        width: 'w-[80px]',
        hideAt: 'xl',
        filterable: true,
        filterOptions: uniquePlatforms,
        renderCell: script => <OSTypeBadgeGroup osTypes={script.supportedPlatforms} iconSize="w-4 h-4" />,
      },
      {
        key: 'addedBy',
        label: 'Added By',
        width: 'w-[120px]',
        filterable: true,
        filterOptions: uniqueAddedBy,
        hideAt: 'xl',
        renderCell: script => <ToolBadge toolType={normalizeToolTypeWithFallback(script.addedBy)} />,
      },
      {
        key: 'category',
        label: 'Category',
        width: 'w-[160px]',
        filterable: true,
        filterOptions: uniqueCategories,
        hideAt: 'lg',
        renderCell: script => (
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-primary line-clamp-2">
            {script.category}
          </span>
        ),
      },
      {
        key: 'description',
        label: 'Description',
        hideAt: 'md',
        renderCell: script => (
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary line-clamp-2">
            {script.description || 'No description'}
          </span>
        ),
      },
    ],
    [uniqueShellTypes, uniqueAddedBy, uniqueCategories, uniquePlatforms],
  );

  const rowActions = useCallback(
    (script: UiScriptEntry) => [
      {
        label: 'Edit Script',
        onClick: () => router.push(`/scripts/edit/${script.id}`),
      },
      {
        label: 'Script Details',
        onClick: () => router.push(`/scripts/details/${script.id}`),
      },
    ],
    [router],
  );

  const renderRowActions = useMemo(() => {
    return (script: UiScriptEntry) => (
      <div className="flex items-center gap-1">
        <MoreActionsMenu items={rowActions(script)} />
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/scripts/details/${script.id}/run`)}
          className="bg-ods-card"
        >
          <PlayIcon size={20} className="text-ods-text-primary" />
        </Button>
      </div>
    );
  }, [router.push, rowActions]);

  // Reset page when search changes
  const lastSearchRef = React.useRef(params.search);
  useEffect(() => {
    if (params.search !== lastSearchRef.current) {
      lastSearchRef.current = params.search;
      setParam('page', 1);
    }
  }, [params.search, setParam]);

  // Reset page when filters change
  const prevFilterKeyRef = React.useRef<string | null>(null);
  useEffect(() => {
    const filterKey = JSON.stringify({
      shellType: params.shellType?.sort() || [],
      addedBy: params.addedBy?.sort() || [],
      category: params.category?.sort() || [],
      supportedPlatforms: params.supportedPlatforms?.sort() || [],
    });

    if (prevFilterKeyRef.current !== null && prevFilterKeyRef.current !== filterKey) {
      setParam('page', 1);
    }
    prevFilterKeyRef.current = filterKey;
  }, [params.shellType, params.addedBy, params.category, params.supportedPlatforms, setParam]);

  const handleRowClick = (script: UiScriptEntry) => {
    router.push(`/scripts/details/${script.id}`);
  };

  const handleNewScript = useCallback(() => {
    router.push('/scripts/edit/new');
  }, [router]);

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, any[]>) => {
      setParams({
        page: 1,
        shellType: columnFilters.shellType || [],
        addedBy: columnFilters.addedBy || [],
        category: columnFilters.category || [],
        supportedPlatforms: columnFilters.supportedPlatforms || [],
      });
    },
    [setParams],
  );

  const cursorPagination = useTablePagination(
    totalPages > 1
      ? {
          type: 'client',
          currentPage: params.page,
          totalPages,
          itemCount: paginatedScripts.length,
          itemName: 'scripts',
          onNext: () => setParam('page', Math.min(params.page + 1, totalPages)),
          onPrevious: () => setParam('page', Math.max(params.page - 1, 1)),
          showInfo: true,
        }
      : null,
  );

  // Convert URL params to table filters format
  const tableFilters = useMemo(
    () => ({
      shellType: params.shellType,
      addedBy: params.addedBy,
      category: params.category,
      supportedPlatforms: params.supportedPlatforms,
    }),
    [params.shellType, params.addedBy, params.category, params.supportedPlatforms],
  );

  const actions = useMemo(
    () => [
      {
        label: 'Add Script',
        icon: <PlusCircleIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleNewScript,
      },
    ],
    [handleNewScript],
  );

  const filterGroups = columns
    .filter(column => column.filterable)
    .map(column => ({
      id: column.key,
      title: column.label,
      options: column.filterOptions || [],
    }));

  return (
    <ListPageLayout
      title="Scripts"
      actions={actions}
      searchPlaceholder="Search for Scripts"
      searchValue={searchInput}
      onSearch={setSearchInput}
      error={error}
      background="default"
      padding="none"
      className="pt-6"
      onMobileFilterChange={handleFilterChange}
      mobileFilterGroups={filterGroups}
      currentMobileFilters={tableFilters}
    >
      {/* Table */}
      <Table
        data={paginatedScripts}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        skeletonRows={pageSize}
        emptyMessage={
          params.search
            ? `No scripts found matching "${params.search}". Try adjusting your search.`
            : 'No scripts found. Try adjusting your filters or add a new script.'
        }
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        rowClassName="mb-1"
        onRowClick={handleRowClick}
        cursorPagination={cursorPagination}
        renderRowActions={renderRowActions}
      />
    </ListPageLayout>
  );
}
