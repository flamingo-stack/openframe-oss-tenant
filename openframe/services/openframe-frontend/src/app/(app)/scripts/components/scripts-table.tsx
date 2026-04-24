'use client';

import {
  OSTypeBadgeGroup,
  type ShellType,
  ShellTypeBadge,
  ToolBadge,
} from '@flamingo-stack/openframe-frontend-core/components';
import {
  ClipboardListIcon,
  PenEditIcon,
  PlusCircleIcon,
  TerminalIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuGroup,
  ListPageLayout,
  Table,
  type TableColumn,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
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
  });
  const pageSize = 10;

  // Local state for debounced input
  const [searchInput, setSearchInput] = useState(params.search);
  const [visibleCount, setVisibleCount] = useState(pageSize);
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

  const visibleScripts = useMemo(() => filteredScripts.slice(0, visibleCount), [filteredScripts, visibleCount]);

  const columns: TableColumn<UiScriptEntry>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        renderCell: script => (
          <span className="text-h4 text-ods-text-primary overflow-x-hidden whitespace-nowrap text-ellipsis">
            {script.name}
          </span>
        ),
      },
      {
        key: 'shellType',
        label: 'Shell Type',
        width: 'w-[160px]',
        hideAt: 'md',
        filterable: true,
        filterOptions: uniqueShellTypes,
        renderCell: script => <ShellTypeBadge shellType={script.shellType as ShellType} />,
      },
      {
        key: 'supportedPlatforms',
        label: 'OS',
        width: 'w-[80px]',
        hideAt: 'lg',
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
        hideAt: 'lg',
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

  const renderRowActions = useCallback((script: UiScriptEntry) => {
    const groups: ActionsMenuGroup[] = [
      {
        items: [
          {
            id: 'run-script',
            label: 'Run Script',
            icon: <TerminalIcon className="w-6 h-6 text-ods-text-secondary" />,
            href: `/scripts/details/${script.id}/run`,
          },
          {
            id: 'edit-script',
            label: 'Edit Script',
            icon: <PenEditIcon className="w-6 h-6 text-ods-text-secondary" />,
            href: `/scripts/edit/${script.id}`,
          },
          {
            id: 'script-details',
            label: 'Script Details',
            icon: <ClipboardListIcon className="w-6 h-6 text-ods-text-secondary" />,
            href: `/scripts/details/${script.id}`,
          },
        ],
      },
    ];

    return <ActionsMenuDropdown groups={groups} />;
  }, []);

  // Reset visible count when search changes
  const lastSearchRef = React.useRef(params.search);
  useEffect(() => {
    if (params.search !== lastSearchRef.current) {
      lastSearchRef.current = params.search;
      setVisibleCount(pageSize);
    }
  }, [params.search]);

  // Reset visible count when filters change
  const prevFilterKeyRef = React.useRef<string | null>(null);
  useEffect(() => {
    const filterKey = JSON.stringify({
      shellType: params.shellType?.sort() || [],
      addedBy: params.addedBy?.sort() || [],
      category: params.category?.sort() || [],
      supportedPlatforms: params.supportedPlatforms?.sort() || [],
    });

    if (prevFilterKeyRef.current !== null && prevFilterKeyRef.current !== filterKey) {
      setVisibleCount(pageSize);
    }
    prevFilterKeyRef.current = filterKey;
  }, [params.shellType, params.addedBy, params.category, params.supportedPlatforms]);

  const handleNewScript = useCallback(() => {
    router.push('/scripts/create');
  }, [router]);

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, any[]>) => {
      setParams({
        shellType: columnFilters.shellType || [],
        addedBy: columnFilters.addedBy || [],
        category: columnFilters.category || [],
        supportedPlatforms: columnFilters.supportedPlatforms || [],
      });
      setVisibleCount(pageSize);
    },
    [setParams],
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
        variant: 'card' as const,
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
      stickyHeader
    >
      {/* Table */}
      <Table
        data={visibleScripts}
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
        rowHref={script => `/scripts/details/${script.id}`}
        infiniteScroll={{
          hasNextPage: visibleCount < filteredScripts.length,
          isFetchingNextPage: false,
          onLoadMore: () => setVisibleCount(prev => prev + pageSize),
          skeletonRows: 2,
        }}
        stickyHeader
        stickyHeaderOffset="top-[56px]"
        renderRowActions={renderRowActions}
      />
    </ListPageLayout>
  );
}
