'use client';

import { OSTypeBadgeGroup } from '@flamingo-stack/openframe-frontend-core/components';
import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  ArrowRightUpIcon,
  BoxArchiveIcon,
  BracketCurlyIcon,
  Filter02Icon,
  PenEditIcon,
  PlayIcon,
  PlusCircleIcon,
  TerminalIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuGroup,
  Button,
  type ColumnDef,
  DataTable,
  FilterModal,
  multiSelectFilterFn,
  PageLayout,
  type Row,
  SquareAvatar,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
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
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { ScriptStatus } from '@/generated/schema-enums';
import { scriptsTableRelayFragment, scriptsTableRelayQuery } from '@/graphql/scripts/scripts-table-relay';
import { getFullImageUrl } from '@/lib/image-url';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { AVAILABLE_PLATFORMS } from '@/lib/platforms';
import { initiatorInitials, initiatorName } from '../utils/execution-helpers';
import { platformsToEnums, platformsToIds, shellToEnum, shellToId } from '../utils/script-mappers';
import { SCRIPT_V2_SHELL_TYPES } from '../utils/shell-types';
import { ScriptShellBadge } from './script-shell-badge';
import { ScriptsTagFilter, ScriptsTagFilterSkeleton } from './scripts-tag-filter';

const PAGE_SIZE = 20;

interface UiScriptEntry {
  id: string;
  name: string;
  description: string;
  shellType: string;
  supportedPlatforms: string[];
  timeout: number;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorImage?: string;
  hasAuthor: boolean;
}

// Static filter options derived from the backend enums (the connection is
// server-paginated, so we can't enumerate distinct values from loaded rows).
// Limited to the shells the product supports (see SCRIPT_V2_SHELL_TYPES).
const SHELL_FILTER_OPTIONS = SCRIPT_V2_SHELL_TYPES.map(s => ({
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
  /** Whether any tag filter is active (kept out of `tableFilters` so it doesn't become a phantom column filter). */
  hasTagFilter: boolean;
  onFilterChange: (filters: Record<string, any[]>) => void;
  onEmptyChange: (isEmpty: boolean) => void;
  mobileFilterOpen: boolean;
  onMobileFilterClose: () => void;
  stickyHeaderOffset: string;
  archived: boolean;
}

function ScriptsTableContent({
  backendFilters,
  debouncedSearch,
  tableFilters,
  hasTagFilter,
  onFilterChange,
  onEmptyChange,
  mobileFilterOpen,
  onMobileFilterClose,
  stickyHeaderOffset,
  archived,
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
        authorId: node.author?.id ?? '',
        authorName: initiatorName(node.author),
        authorInitials: initiatorInitials(node.author),
        authorImage: getFullImageUrl(node.author?.image?.imageUrl, node.author?.image?.hash),
        hasAuthor: Boolean(node.author),
      };
    });
  }, [data.scripts?.edges]);

  const fetchNextPage = useCallback(() => {
    if (hasNext && !isLoadingNext) {
      loadNext(PAGE_SIZE);
    }
  }, [hasNext, isLoadingNext, loadNext]);

  // "Added by" filter options. There's no backend query for distinct script
  // authors, so we derive them from loaded rows and accumulate across pages
  // (a ref keeps already-seen authors in the dropdown even after a filter
  // narrows the result set). Caveat: an author never loaded won't appear.
  const authorAccRef = useRef<Map<string, string>>(new Map());
  const authorOptions = useMemo(() => {
    for (const script of transformedScripts) {
      if (script.hasAuthor && script.authorId) authorAccRef.current.set(script.authorId, script.authorName);
    }
    return Array.from(authorAccRef.current, ([id, label]) => ({ id, label, value: id })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [transformedScripts]);

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
          {
            // Disabled until the backend ships an archive mutation — there's no way
            // to set status=ARCHIVED today (updateScript has no `status`, and no
            // archiveScript mutation exists). See SCRIPTS_BACKEND_GAPS.md.
            id: 'archive-script',
            label: 'Archive Script',
            icon: <BoxArchiveIcon className="w-6 h-6 text-ods-text-secondary" />,
            disabled: true,
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
          <ScriptShellBadge value={row.original.shellType} iconClassName="w-4 h-4 md:w-6 md:h-6" />
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
          width: 'w-[80px]',
          hideAt: 'lg',
          filter: { options: PLATFORM_FILTER_OPTIONS },
        },
      },
      {
        // "Added by" = Script.author. Server filter via `authorIds`; the dropdown
        // options are derived from loaded rows (no distinct-authors query exists).
        // accessorKey is `authorId` so the option values (ids) match the server filter.
        accessorKey: 'authorId',
        header: 'Added by',
        cell: ({ row }: { row: Row<UiScriptEntry> }) =>
          row.original.hasAuthor ? (
            <div className="flex items-center gap-2 min-w-0">
              <SquareAvatar
                variant="round"
                size="sm"
                src={row.original.authorImage}
                fallback={row.original.authorInitials}
                alt={row.original.authorName}
                initialsClassName="text-ods-text-secondary"
              />
              {/* min-w-0 flex-1 wrapper so the FloatingTooltip's block div can shrink and the name ellipsizes. */}
              <div className="min-w-0 flex-1">
                <TruncateText>{row.original.authorName}</TruncateText>
              </div>
            </div>
          ) : (
            <TruncateText tone="secondary">—</TruncateText>
          ),
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: { width: 'w-[250px]', hideAt: 'lg', filter: { options: authorOptions } },
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
    [renderRowActions, authorOptions],
  );

  const filterGroups = useMemo(
    () => [
      { id: 'shellType', title: 'Shell Type', options: SHELL_FILTER_OPTIONS },
      { id: 'supportedPlatforms', title: 'OS', options: PLATFORM_FILTER_OPTIONS },
      { id: 'authorId', title: 'Added by', options: authorOptions },
    ],
    [authorOptions],
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

  const hasActiveFilters = hasTagFilter || Object.values(tableFilters).some(values => values.length > 0);
  const showEmptyState = !debouncedSearch && !hasActiveFilters && !isPending && transformedScripts.length === 0;

  useEffect(() => {
    onEmptyChange(showEmptyState);
  }, [showEmptyState, onEmptyChange]);

  if (showEmptyState && archived) {
    return (
      <EmptyState
        icon={<BoxArchiveIcon />}
        title="No archived scripts"
        description="Scripts you archive will be moved here. They stay out of the main list but can be reviewed any time."
      />
    );
  }

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
        <DataTable.Header stickyHeader stickyHeaderOffset={stickyHeaderOffset} rightSlot={<DataTable.RowCount />} />
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

function ScriptsTableSkeleton({ stickyHeaderOffset }: { stickyHeaderOffset: string }) {
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
        meta: { width: 'w-[80px]', hideAt: 'lg' },
      },
      {
        accessorKey: 'authorName',
        header: 'Added by',
        enableSorting: false,
        meta: { width: 'w-[250px]', hideAt: 'lg' },
      },
      // Mirror the real table's trailing action columns (row actions menu + open
      // button) so the loading header reserves the same width and stays aligned.
      { id: 'actions', enableSorting: false, meta: { width: 'w-12 shrink-0 flex-none', align: 'right' } },
      { id: 'open', enableSorting: false, meta: { width: 'w-12 shrink-0 flex-none', align: 'right' } },
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
      <DataTable.Header stickyHeader stickyHeaderOffset={stickyHeaderOffset} />
      <DataTable.Body loading={true} skeletonRows={PAGE_SIZE} emptyMessage="" rowClassName="mb-1" />
    </DataTable>
  );
}

// ----------------------------------------------------------------
// Outer shell — layout + URL state + Suspense boundary
// ----------------------------------------------------------------

interface ScriptsTableProps {
  /** When true, lists archived scripts (status = ARCHIVED) with a back button instead of the Archive/Add actions. */
  archived?: boolean;
}

export function ScriptsTable({ archived = false }: ScriptsTableProps = {}) {
  const router = useRouter();
  const handleBack = useSafeBack('/scripts-v2');

  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    shellType: { type: 'array', default: [] },
    supportedPlatforms: { type: 'array', default: [] },
    authorId: { type: 'array', default: [] },
    tagIds: { type: 'array', default: [] },
  });

  // Local search input keeps typing responsive; the shared hook debounces it to
  // the URL param and guards the back/forward sync-down against clobbering typing.
  const {
    search: searchInput,
    setSearch: setSearchInput,
    debouncedSearch,
  } = useSearchParam(params.search, value => setParam('search', value), 300);

  const [isEmpty, setIsEmpty] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();

  const backendFilters: ScriptFilterInput = useMemo(() => {
    const shells = params.shellType.map(shellToEnum);
    const supportedPlatforms = platformsToEnums(params.supportedPlatforms);
    // Default scripts() (null statuses) returns ACTIVE + ARCHIVED together; scope
    // each page explicitly so the archive lives on its own list.
    return {
      statuses: [archived ? ScriptStatus.ARCHIVED : ScriptStatus.ACTIVE],
      ...(shells.length > 0 && { shells }),
      ...(supportedPlatforms.length > 0 && { supportedPlatforms }),
      ...(params.authorId.length > 0 && { authorIds: params.authorId }),
      ...(params.tagIds.length > 0 && { tagIds: params.tagIds }),
    };
  }, [archived, params.shellType, params.supportedPlatforms, params.authorId, params.tagIds]);

  const tableFilters = useMemo(
    () => ({
      shellType: params.shellType,
      supportedPlatforms: params.supportedPlatforms,
      authorId: params.authorId,
    }),
    [params.shellType, params.supportedPlatforms, params.authorId],
  );

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, any[]>) => {
      setParams({
        shellType: columnFilters.shellType || [],
        supportedPlatforms: columnFilters.supportedPlatforms || [],
        authorId: columnFilters.authorId || [],
      });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParams],
  );

  const handleNewScript = useCallback(() => {
    router.push('/scripts-v2/create');
  }, [router]);

  const handleOpenArchive = useCallback(() => {
    router.push('/scripts-v2/archived');
  }, [router]);

  // Archived list has no header actions (back button only); the active list shows
  // Archive (→ archived page) + Add Script. "Edit Categories" is intentionally omitted.
  const actions = useMemo(
    () =>
      archived
        ? []
        : [
            {
              label: 'Archive',
              variant: 'outline' as const,
              icon: <BoxArchiveIcon className="w-6 h-6 text-ods-text-secondary" />,
              onClick: handleOpenArchive,
            },
            {
              label: 'Add Script',
              variant: (isEmpty ? 'accent' : 'outline') as 'accent' | 'outline',
              icon: (
                <PlusCircleIcon size={24} className={isEmpty ? 'text-ods-text-on-accent' : 'text-ods-text-secondary'} />
              ),
              onClick: handleNewScript,
            },
          ],
    [archived, handleNewScript, handleOpenArchive, isEmpty],
  );

  const mobileFilterButton = (
    <Button
      variant="outline"
      size="icon"
      className="md:hidden"
      onClick={() => setMobileFilterOpen(true)}
      aria-label="Open filters"
      leftIcon={<Filter02Icon />}
    />
  );

  return (
    <PageLayout
      title={archived ? 'Archived Scripts' : 'Scripts'}
      backButton={archived ? { label: 'Back', onClick: handleBack } : undefined}
      actions={actions.length > 0 ? actions : undefined}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <div className="flex flex-col" style={containerStyle}>
        {!isEmpty && (
          <div
            ref={toolbarRef}
            className="sticky top-0 z-20 flex flex-col gap-[var(--spacing-system-xxs)] bg-ods-bg -mx-[var(--spacing-system-l)] px-[var(--spacing-system-l)] pt-[var(--spacing-system-l)] pb-[var(--spacing-system-m)] -mt-[var(--spacing-system-l)]"
          >
            <Suspense
              fallback={
                <ScriptsTagFilterSkeleton
                  search={searchInput}
                  onSearchChange={setSearchInput}
                  filterButton={mobileFilterButton}
                />
              }
            >
              <ScriptsTagFilter
                search={searchInput}
                onSearchChange={setSearchInput}
                tagIds={params.tagIds}
                onTagIdsChange={ids => setParam('tagIds', ids)}
                filterButton={mobileFilterButton}
              />
            </Suspense>
          </div>
        )}

        <Suspense fallback={<ScriptsTableSkeleton stickyHeaderOffset={stickyHeaderOffset} />}>
          <ScriptsTableContent
            backendFilters={backendFilters}
            debouncedSearch={debouncedSearch}
            tableFilters={tableFilters}
            hasTagFilter={params.tagIds.length > 0}
            onFilterChange={handleFilterChange}
            onEmptyChange={setIsEmpty}
            mobileFilterOpen={mobileFilterOpen}
            onMobileFilterClose={() => setMobileFilterOpen(false)}
            stickyHeaderOffset={stickyHeaderOffset}
            archived={archived}
          />
        </Suspense>
      </div>
    </PageLayout>
  );
}
