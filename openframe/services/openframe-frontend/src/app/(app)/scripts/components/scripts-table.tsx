'use client';

import {
  OSTypeBadgeGroup,
  type ShellType,
  ShellTypeBadge,
  ToolBadge,
} from '@flamingo-stack/openframe-frontend-core/components';
import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  ArrowRightUpIcon,
  BookPlayIcon,
  BracketCurlyIcon,
  ClipboardListIcon,
  CodeAIIcon,
  Filter02Icon,
  PenEditIcon,
  PlayCircleIcon,
  PlayIcon,
  PlusCircleIcon,
  SearchIcon,
  TerminalIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuGroup,
  Button,
  type ColumnDef,
  type ColumnFiltersState,
  DataTable,
  FilterModal,
  Input,
  multiSelectFilterFn,
  PageError,
  PageLayout,
  type Row,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { getOSLabel, normalizeToolTypeWithFallback } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAskMingo } from '@/app/(app)/mingo/hooks/use-ask-mingo';
import { EmptyState } from '@/app/components/shared';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { routes } from '@/lib/routes';
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
  const askMingo = useAskMingo();

  // URL state management - search, filters, and pagination persist in URL
  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    shellType: { type: 'array', default: [] },
    category: { type: 'array', default: [] },
    supportedPlatforms: { type: 'array', default: [] },
  });
  const pageSize = 10;

  // Search keeps typing responsive; the shared hook debounces the write to the
  // URL param (which drives filtering) and guards the back/forward sync-down
  // against clobbering typing.
  const { search: searchInput, setSearch: setSearchInput } = useSearchParam(
    params.search,
    value => setParam('search', value),
    300,
  );
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();

  const { scripts, isLoading, error } = useScripts();

  const transformedScripts: UiScriptEntry[] = useMemo(() => {
    return scripts.map(script => ({
      id: script.id,
      name: script.name,
      description: script.description,
      shellType: script.shell,
      // TODO(openframe-rmm): Tactical RMM removed — "Added By" was always the Tactical tool
      // badge. Populate from the real source once the OpenFrame RMM scripts API is wired up.
      addedBy: normalizeToolTypeWithFallback(''),
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
          script.name?.toLowerCase().includes(searchLower) || script.description?.toLowerCase().includes(searchLower),
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
    const runHref = routes.scripts.run(script.id);
    const editHref = routes.scripts.edit(script.id);
    const detailsHref = routes.scripts.details(script.id);
    const newTabIcon = <ArrowRightUpIcon className="w-5 h-5 text-ods-text-secondary" />;

    const groups: ActionsMenuGroup[] = [
      {
        items: [
          {
            id: 'run-script',
            label: 'Run Script',
            icon: <TerminalIcon className="w-6 h-6 text-ods-text-secondary" />,
            href: runHref,
            iconAction: {
              icon: newTabIcon,
              'aria-label': 'Open Run Script in new tab',
              href: runHref,
              openInNewTab: true,
            },
          },
          {
            id: 'edit-script',
            label: 'Edit Script',
            icon: <PenEditIcon className="w-6 h-6 text-ods-text-secondary" />,
            href: editHref,
            iconAction: {
              icon: newTabIcon,
              'aria-label': 'Open Edit Script in new tab',
              href: editHref,
              openInNewTab: true,
            },
          },
          {
            id: 'script-details',
            label: 'Script Details',
            icon: <ClipboardListIcon className="w-6 h-6 text-ods-text-secondary" />,
            href: detailsHref,
            iconAction: {
              icon: newTabIcon,
              'aria-label': 'Open Script Details in new tab',
              href: detailsHref,
              openInNewTab: true,
            },
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
        cell: ({ row }: { row: Row<UiScriptEntry> }) => <TruncateText>{row.original.name}</TruncateText>,
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
        cell: ({ row }: { row: Row<UiScriptEntry> }) => <TruncateText lines={2}>{row.original.category}</TruncateText>,
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
          <TruncateText lines={2} tone="secondary">
            {row.original.description || '—'}
          </TruncateText>
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
              onClick={openInNewTab(routes.scripts.details(row.original.id))}
              variant="outline"
              size="icon"
              leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
              aria-label="Open in new tab"
              className="bg-ods-card"
            />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', hideAt: 'md', align: 'right' },
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

  const scriptRowHref = useCallback((script: UiScriptEntry) => routes.scripts.details(script.id), []);

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
    router.push(routes.scripts.new);
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

  // Show the empty state instead of the search bar + table only when there is
  // genuinely no data: loading finished, no active search/filters, and no scripts.
  const showEmptyState =
    !isLoading &&
    !params.search.trim() &&
    params.shellType.length === 0 &&
    params.category.length === 0 &&
    params.supportedPlatforms.length === 0 &&
    scripts.length === 0;

  const actions = useMemo(
    () => [
      {
        label: 'Add Script',
        variant: (showEmptyState ? 'accent' : 'outline') as 'accent' | 'outline',
        icon: (
          <PlusCircleIcon
            size={24}
            className={showEmptyState ? 'text-ods-text-on-accent' : 'text-ods-text-secondary'}
          />
        ),
        onClick: handleNewScript,
      },
    ],
    [handleNewScript, showEmptyState],
  );

  const filterGroups = useMemo(
    () => [
      { id: 'shellType', title: 'Shell Type', options: uniqueShellTypes },
      { id: 'supportedPlatforms', title: 'OS', options: uniquePlatforms },
      { id: 'category', title: 'Category', options: uniqueCategories },
    ],
    [uniqueShellTypes, uniquePlatforms, uniqueCategories],
  );

  const hasMobileFilter = filterGroups.length > 0;

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <PageLayout title="Scripts" actions={actions} className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]">
      {showEmptyState ? (
        <EmptyState
          icon={<BracketCurlyIcon />}
          title="No scripts yet"
          description="Reusable code snippets you run on devices to automate tasks, fix issues, or collect data will be displayed here."
          actions={[
            { icon: <PlayIcon />, label: 'Run on one device or push to many at once' },
            { icon: <TerminalIcon />, label: 'Write in PowerShell, Bash, Python, or Batch' },
            {
              icon: (
                <MingoIcon
                  className="size-5"
                  eyesColor="var(--ods-flamingo-cyan-base)"
                  cornerColor="var(--ods-flamingo-cyan-base)"
                />
              ),
              label: 'Let Mingo suggest or generate scripts for you',
            },
          ]}
          buttonLabel="Ask Mingo about Scripts"
          buttonIcon={
            <MingoIcon
              className="size-5"
              eyesColor="var(--ods-flamingo-cyan-base)"
              cornerColor="var(--ods-flamingo-cyan-base)"
            />
          }
          onButtonClick={() => askMingo('scripts')}
        />
      ) : (
        <div className="flex flex-col" style={containerStyle}>
          <div
            ref={toolbarRef}
            className="sticky top-0 z-20 flex gap-[var(--spacing-system-m)] items-center bg-ods-bg -mx-[var(--spacing-system-l)] p-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]"
          >
            <Input
              placeholder="Search for Scripts"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="flex-1"
              startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
            />
            {hasMobileFilter && (
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileFilterOpen(true)}
                aria-label="Open filters"
                leftIcon={<Filter02Icon />}
              />
            )}
          </div>

          {hasMobileFilter && (
            <FilterModal
              isOpen={mobileFilterOpen}
              onClose={() => setMobileFilterOpen(false)}
              filterGroups={filterGroups}
              onFilterChange={handleMobileFilterChange}
              currentFilters={mobileFilters}
            />
          )}

          <DataTable table={table}>
            <DataTable.Header stickyHeader stickyHeaderOffset={stickyHeaderOffset} rightSlot={<DataTable.RowCount />} />
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
        </div>
      )}
    </PageLayout>
  );
}
