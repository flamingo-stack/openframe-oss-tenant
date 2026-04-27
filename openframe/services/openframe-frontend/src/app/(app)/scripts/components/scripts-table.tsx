'use client';

import {
  OSTypeBadgeGroup,
  type ShellType,
  ShellTypeBadge,
  ToolBadge,
} from '@flamingo-stack/openframe-frontend-core/components';
import {
  Chevron02RightIcon,
  ClipboardListIcon,
  PenEditIcon,
  PlusCircleIcon,
  TerminalIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuGroup,
  Button,
  type ColumnDef,
  type ColumnFiltersState,
  DataTable,
  ListPageLayout,
  multiSelectFilterFn,
  type Row,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { getOSLabel, normalizeToolTypeWithFallback } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

    if (params.category && params.category.length > 0) {
      filtered = filtered.filter(script => params.category.includes(script.category));
    }

    if (params.supportedPlatforms && params.supportedPlatforms.length > 0) {
      filtered = filtered.filter(script =>
        script.supportedPlatforms.some(platform => params.supportedPlatforms.includes(platform)),
      );
    }

    return filtered;
  }, [transformedScripts, params.search, params.shellType, params.category, params.supportedPlatforms]);

  const visibleScripts = useMemo(() => filteredScripts.slice(0, visibleCount), [filteredScripts, visibleCount]);

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

  const columns = useMemo<ColumnDef<UiScriptEntry>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }: { row: Row<UiScriptEntry> }) => (
          <span className="text-h4 text-ods-text-primary overflow-x-hidden whitespace-nowrap text-ellipsis">
            {row.original.name}
          </span>
        ),
        enableSorting: false,
        meta: { width: 'flex-1 min-w-0' },
      },
      {
        accessorKey: 'shellType',
        header: 'Shell Type',
        cell: ({ row }: { row: Row<UiScriptEntry> }) => (
          <ShellTypeBadge shellType={row.original.shellType as ShellType} iconClassName="w-4 h-4 md:w-6 md:h-6" />
        ),
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: {
          width: 'w-[100px] md:w-[160px]',
          filter: { options: uniqueShellTypes },
        },
      },
      {
        accessorKey: 'supportedPlatforms',
        header: 'OS',
        cell: ({ row }: { row: Row<UiScriptEntry> }) => (
          <OSTypeBadgeGroup osTypes={row.original.supportedPlatforms} iconSize="w-4 h-4 md:w-6 md:h-6" />
        ),
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: {
          width: 'w-[90px]',
          hideAt: 'lg',
          filter: { options: uniquePlatforms },
        },
      },
      {
        accessorKey: 'addedBy',
        header: 'Added By',
        cell: ({ row }: { row: Row<UiScriptEntry> }) => (
          <ToolBadge
            toolType={normalizeToolTypeWithFallback(row.original.addedBy)}
            iconClassName="w-4 h-4 md:w-6 md:h-6"
          />
        ),
        enableSorting: false,
        meta: { width: 'w-[120px]', hideAt: 'lg' },
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }: { row: Row<UiScriptEntry> }) => (
          <span className="text-h4 text-ods-text-primary line-clamp-2">{row.original.category}</span>
        ),
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: {
          width: 'w-[160px]',
          hideAt: 'md',
          filter: { options: uniqueCategories },
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }: { row: Row<UiScriptEntry> }) => (
          <span className="text-h4 text-ods-text-secondary line-clamp-2">{row.original.description || '—'}</span>
        ),
        enableSorting: false,
        meta: { width: 'flex-1', hideAt: 'lg' },
      },
      {
        id: 'actions',
        cell: ({ row }: { row: Row<UiScriptEntry> }) => (
          <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
            {renderRowActions(row.original)}
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<UiScriptEntry> }) => (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <Button
              href={`/scripts/details/${row.original.id}`}
              prefetch={false}
              variant="outline"
              size="icon"
              centerIcon={<Chevron02RightIcon className="w-5 h-5" />}
              aria-label="View details"
              className="bg-ods-card"
            />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [renderRowActions, uniqueShellTypes, uniquePlatforms, uniqueCategories],
  );

  // Column-filter state mirrors URL params. `useApiParams` keeps each array
  // reference-stable when its content is unchanged, so listing the raw arrays
  // as deps is safe — no content-key gymnastics needed.
  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const state: ColumnFiltersState = [];
    if (params.shellType?.length) state.push({ id: 'shellType', value: params.shellType });
    if (params.supportedPlatforms?.length) state.push({ id: 'supportedPlatforms', value: params.supportedPlatforms });
    if (params.category?.length) state.push({ id: 'category', value: params.category });
    return state;
  }, [params.shellType, params.supportedPlatforms, params.category]);

  // Ref to the latest columnFilters so the change handler can remain stable.
  const columnFiltersRef = useRef<ColumnFiltersState>(columnFilters);
  columnFiltersRef.current = columnFilters;

  const handleColumnFiltersChange = useCallback(
    (updater: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => {
      const next = typeof updater === 'function' ? updater(columnFiltersRef.current) : updater;
      const get = (id: string) => (next.find(f => f.id === id)?.value as string[]) ?? [];
      setParams({
        shellType: get('shellType'),
        supportedPlatforms: get('supportedPlatforms'),
        category: get('category'),
      });
      setVisibleCount(pageSize);
    },
    [setParams],
  );

  const table = useDataTable<UiScriptEntry>({
    data: visibleScripts,
    columns,
    getRowId: (row: UiScriptEntry) => String(row.id),
    enableSorting: false,
    state: { columnFilters },
    onColumnFiltersChange: handleColumnFiltersChange,
  });

  const scriptRowHref = useCallback((script: UiScriptEntry) => `/scripts/details/${script.id}`, []);

  const handleLoadMore = useCallback(() => setVisibleCount(prev => prev + pageSize), []);

  // Reset visible count when search changes
  const lastSearchRef = React.useRef(params.search);
  useEffect(() => {
    if (params.search !== lastSearchRef.current) {
      lastSearchRef.current = params.search;
      setVisibleCount(pageSize);
    }
  }, [params.search]);

  const handleNewScript = useCallback(() => {
    router.push('/scripts/create');
  }, [router]);

  const handleMobileFilterChange = useCallback(
    (next: Record<string, any[]>) => {
      setParams({
        shellType: next.shellType || [],
        category: next.category || [],
        supportedPlatforms: next.supportedPlatforms || [],
      });
      setVisibleCount(pageSize);
    },
    [setParams],
  );

  const mobileFilters = useMemo(
    () => ({
      shellType: params.shellType,
      category: params.category,
      supportedPlatforms: params.supportedPlatforms,
    }),
    [params.shellType, params.category, params.supportedPlatforms],
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

  const filterGroups = useMemo(
    () => [
      { id: 'shellType', title: 'Shell Type', options: uniqueShellTypes },
      { id: 'supportedPlatforms', title: 'OS', options: uniquePlatforms },
      { id: 'category', title: 'Category', options: uniqueCategories },
    ],
    [uniqueShellTypes, uniquePlatforms, uniqueCategories],
  );

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
      onMobileFilterChange={handleMobileFilterChange}
      mobileFilterGroups={filterGroups}
      currentMobileFilters={mobileFilters}
      stickyHeader
    >
      <DataTable table={table}>
        <DataTable.Header stickyHeader stickyHeaderOffset="top-[56px]" rightSlot={<DataTable.RowCount />} />
        <DataTable.Body
          loading={isLoading}
          skeletonRows={pageSize}
          emptyMessage={
            params.search
              ? `No scripts found matching "${params.search}". Try adjusting your search.`
              : 'No scripts found. Try adjusting your filters or add a new script.'
          }
          rowClassName="mb-1"
          rowHref={scriptRowHref}
        />
        {visibleCount < filteredScripts.length && (
          <DataTable.InfiniteFooter
            hasNextPage
            isFetchingNextPage={false}
            onLoadMore={handleLoadMore}
            skeletonRows={2}
          />
        )}
      </DataTable>
    </ListPageLayout>
  );
}
