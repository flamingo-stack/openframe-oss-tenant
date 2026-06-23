'use client';

import { OSTypeBadgeGroup, type ShellType, ShellTypeBadge } from '@flamingo-stack/openframe-frontend-core/components';
import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  ArrowRightUpIcon,
  BracketCurlyIcon,
  Filter02Icon,
  PenEditIcon,
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
  DataTable,
  FilterModal,
  Input,
  multiSelectFilterFn,
  PageLayout,
  type Row,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { SHELL_TYPES } from '@flamingo-stack/openframe-frontend-core/types';
import { getOSLabel } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useLazyLoadQuery, usePaginationFragment } from 'react-relay';
import type { scriptsTableRelay_query$key as ScriptsFragmentKey } from '@/__generated__/scriptsTableRelay_query.graphql';
import type { scriptsTableRelayPaginationQuery as ScriptsPaginationQueryType } from '@/__generated__/scriptsTableRelayPaginationQuery.graphql';
import type {
  ScriptFilterInput,
  scriptsTableRelayQuery as ScriptsTableQueryType,
} from '@/__generated__/scriptsTableRelayQuery.graphql';
import { useAskMingo } from '@/app/(app)/mingo/hooks/use-ask-mingo';
import { EmptyState } from '@/app/components/shared';
import { scriptsTableRelayFragment, scriptsTableRelayQuery } from '@/graphql/scripts/scripts-table-relay';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { AVAILABLE_PLATFORMS } from '@/lib/platforms';
import { ALLOWED_SHELL_IDS, platformsToEnums, platformsToIds, shellToEnum, shellToId } from '../utils/script-mappers';

const PAGE_SIZE = 20;

interface UiScriptEntry {
  id: string;
  name: string;
  description: string;
  shellType: string;
  supportedPlatforms: string[];
  timeout: number;
}

// Static filter options derived from the backend enums (the connection is
// server-paginated, so we can't enumerate distinct values from loaded rows).
// Limited to the shells the product supports (see ALLOWED_SHELL_IDS).
const SHELL_FILTER_OPTIONS = SHELL_TYPES.filter(s => ALLOWED_SHELL_IDS.includes(s.value)).map(s => ({
  id: s.value,
  label: s.label,
  value: s.value,
}));

const PLATFORM_FILTER_OPTIONS = AVAILABLE_PLATFORMS.map(p => ({
  id: p.id,
  label: getOSLabel(p.id),
  value: p.id,
}));

// ----------------------------------------------------------------
// Inner content — Relay hooks, must live inside Suspense
// ----------------------------------------------------------------

interface ScriptsTableContentProps {
  backendFilters: ScriptFilterInput;
  debouncedSearch: string;
  tableFilters: Record<string, string[]>;
  onFilterChange: (filters: Record<string, any[]>) => void;
  onEmptyChange: (isEmpty: boolean) => void;
  mobileFilterOpen: boolean;
  onMobileFilterClose: () => void;
}

function ScriptsTableContent({
  backendFilters,
  debouncedSearch,
  tableFilters,
  onFilterChange,
  onEmptyChange,
  mobileFilterOpen,
  onMobileFilterClose,
}: ScriptsTableContentProps) {
  const askMingo = useAskMingo();
  const [isPending] = useTransition();

  const queryData = useLazyLoadQuery<ScriptsTableQueryType>(
    scriptsTableRelayQuery,
    {
      filter: backendFilters,
      search: debouncedSearch || null,
      first: PAGE_SIZE,
      after: null,
    },
    { fetchPolicy: 'store-and-network' },
  );

  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment<
    ScriptsPaginationQueryType,
    ScriptsFragmentKey
  >(scriptsTableRelayFragment, queryData);

  const transformedScripts: UiScriptEntry[] = useMemo(() => {
    const edges = data.scripts?.edges ?? [];
    return edges.map(edge => {
      const node = edge.node;
      return {
        id: node.id,
        name: node.name,
        description: node.description ?? '',
        shellType: shellToId(node.shell),
        supportedPlatforms: platformsToIds(node.supportedPlatforms),
        timeout: node.defaultTimeoutSeconds ?? 300,
      };
    });
  }, [data.scripts?.edges]);

  const fetchNextPage = useCallback(() => {
    if (hasNext && !isLoadingNext) {
      loadNext(PAGE_SIZE);
    }
  }, [hasNext, isLoadingNext, loadNext]);

  const renderRowActions = useCallback((script: UiScriptEntry) => {
    const runHref = `/scripts-v2/details/${script.id}/run`;
    const editHref = `/scripts-v2/edit/${script.id}`;
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
          <div className="flex flex-col justify-center gap-1 min-w-0">
            <TruncateText>{row.original.name}</TruncateText>
            {row.original.description && (
              <TruncateText variant="h6" tone="secondary">
                {row.original.description}
              </TruncateText>
            )}
          </div>
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
          filter: { options: SHELL_FILTER_OPTIONS },
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
          filter: { options: PLATFORM_FILTER_OPTIONS },
        },
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
              onClick={openInNewTab(`/scripts-v2/details/${row.original.id}`)}
              variant="outline"
              size="icon"
              leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
              aria-label="Open in new tab"
              className="bg-ods-card"
            />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [renderRowActions],
  );

  const filterGroups = useMemo(
    () => [
      { id: 'shellType', title: 'Shell Type', options: SHELL_FILTER_OPTIONS },
      { id: 'supportedPlatforms', title: 'OS', options: PLATFORM_FILTER_OPTIONS },
    ],
    [],
  );

  const columnFilters = useMemo(
    () =>
      Object.entries(tableFilters)
        .filter(([, value]) => value && value.length > 0)
        .map(([id, value]) => ({ id, value })),
    [tableFilters],
  );

  const handleColumnFiltersChange = useCallback(
    (updater: any) => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater;
      const nextFilters: Record<string, any[]> = {};
      for (const f of next) {
        nextFilters[f.id] = Array.isArray(f.value) ? f.value : [f.value];
      }
      onFilterChange(nextFilters);
    },
    [columnFilters, onFilterChange],
  );

  const table = useDataTable<UiScriptEntry>({
    data: transformedScripts,
    columns,
    getRowId: (row: UiScriptEntry) => row.id,
    enableSorting: false,
    state: { columnFilters },
    onColumnFiltersChange: handleColumnFiltersChange,
  });

  const scriptRowHref = useCallback((script: UiScriptEntry) => `/scripts-v2/details/${script.id}`, []);

  const hasActiveFilters = Object.values(tableFilters).some(values => values.length > 0);
  const showEmptyState = !debouncedSearch && !hasActiveFilters && !isPending && transformedScripts.length === 0;

  useEffect(() => {
    onEmptyChange(showEmptyState);
  }, [showEmptyState, onEmptyChange]);

  if (showEmptyState) {
    return (
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
    );
  }

  return (
    <>
      <DataTable table={table}>
        <DataTable.Header stickyHeader stickyHeaderOffset="top-0" rightSlot={<DataTable.RowCount />} />
        <DataTable.Body
          loading={isPending}
          skeletonRows={PAGE_SIZE}
          emptyMessage={
            debouncedSearch
              ? `No scripts found matching "${debouncedSearch}". Try adjusting your search.`
              : 'No scripts found. Try adjusting your filters or add a new script.'
          }
          rowClassName="mb-1"
          rowHref={scriptRowHref}
        />
        <DataTable.InfiniteFooter
          hasNextPage={hasNext}
          isFetchingNextPage={isLoadingNext}
          onLoadMore={fetchNextPage}
          skeletonRows={2}
        />
      </DataTable>

      <FilterModal
        isOpen={mobileFilterOpen}
        onClose={onMobileFilterClose}
        filterGroups={filterGroups}
        onFilterChange={onFilterChange}
        currentFilters={tableFilters}
      />
    </>
  );
}

// ----------------------------------------------------------------
// Loading skeleton
// ----------------------------------------------------------------

const EMPTY_ROWS: UiScriptEntry[] = [];

function ScriptsTableSkeleton() {
  const columns = useMemo<ColumnDef<UiScriptEntry>[]>(
    () => [
      { accessorKey: 'name', header: 'Name', enableSorting: false, meta: { width: 'flex-1 min-w-0' } },
      {
        accessorKey: 'shellType',
        header: 'Shell Type',
        enableSorting: false,
        meta: { width: 'w-[100px] md:w-[160px]' },
      },
      {
        accessorKey: 'supportedPlatforms',
        header: 'OS',
        enableSorting: false,
        meta: { width: 'w-[90px]', hideAt: 'lg' },
      },
    ],
    [],
  );

  const table = useDataTable<UiScriptEntry>({
    data: EMPTY_ROWS,
    columns,
    getRowId: (row: UiScriptEntry) => row.id,
    enableSorting: false,
  });

  return (
    <DataTable table={table}>
      <DataTable.Header stickyHeader stickyHeaderOffset="top-0" />
      <DataTable.Body loading={true} skeletonRows={PAGE_SIZE} emptyMessage="" rowClassName="mb-1" />
    </DataTable>
  );
}

// ----------------------------------------------------------------
// Outer shell — layout + URL state + Suspense boundary
// ----------------------------------------------------------------

export function ScriptsTable() {
  const router = useRouter();

  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    shellType: { type: 'array', default: [] },
    supportedPlatforms: { type: 'array', default: [] },
  });

  const [searchInput, setSearchInput] = useState(params.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  const setParamRef = useRef(setParam);
  setParamRef.current = setParam;
  useEffect(() => {
    setParamRef.current('search', debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    setSearchInput(params.search);
  }, [params.search]);

  const [isEmpty, setIsEmpty] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const backendFilters: ScriptFilterInput = useMemo(() => {
    const shells = params.shellType.map(shellToEnum);
    const supportedPlatforms = platformsToEnums(params.supportedPlatforms);
    return {
      ...(shells.length > 0 && { shells }),
      ...(supportedPlatforms.length > 0 && { supportedPlatforms }),
    };
  }, [params.shellType, params.supportedPlatforms]);

  const tableFilters = useMemo(
    () => ({
      shellType: params.shellType,
      supportedPlatforms: params.supportedPlatforms,
    }),
    [params.shellType, params.supportedPlatforms],
  );

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, any[]>) => {
      setParams({
        shellType: columnFilters.shellType || [],
        supportedPlatforms: columnFilters.supportedPlatforms || [],
      });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParams],
  );

  const handleNewScript = useCallback(() => {
    router.push('/scripts-v2/create');
  }, [router]);

  const actions = useMemo(
    () => [
      {
        label: 'Add Script',
        variant: (isEmpty ? 'accent' : 'outline') as 'accent' | 'outline',
        icon: <PlusCircleIcon size={24} className={isEmpty ? 'text-ods-text-on-accent' : 'text-ods-text-secondary'} />,
        onClick: handleNewScript,
      },
    ],
    [handleNewScript, isEmpty],
  );

  return (
    <PageLayout title="Scripts" actions={actions}>
      {!isEmpty && (
        <div className="sticky top-0 z-20 flex items-center gap-[var(--spacing-system-m)] bg-ods-bg py-[var(--spacing-system-l)] -my-[var(--spacing-system-l)]">
          <Input
            placeholder="Search for Scripts"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="flex-1"
            startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
          />
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileFilterOpen(true)}
            aria-label="Open filters"
            leftIcon={<Filter02Icon />}
          />
        </div>
      )}

      <Suspense fallback={<ScriptsTableSkeleton />}>
        <ScriptsTableContent
          backendFilters={backendFilters}
          debouncedSearch={debouncedSearch}
          tableFilters={tableFilters}
          onFilterChange={handleFilterChange}
          onEmptyChange={setIsEmpty}
          mobileFilterOpen={mobileFilterOpen}
          onMobileFilterClose={() => setMobileFilterOpen(false)}
        />
      </Suspense>
    </PageLayout>
  );
}
