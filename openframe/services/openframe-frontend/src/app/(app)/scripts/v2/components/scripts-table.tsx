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
import { useApiParams, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchQuery, useLazyLoadQuery, useMutation, usePaginationFragment, useRelayEnvironment } from 'react-relay';
import type { RecordSourceSelectorProxy } from 'relay-runtime';
import type { archiveScriptMutation as ArchiveScriptMutationType } from '@/__generated__/archiveScriptMutation.graphql';
import type { scriptFiltersRefreshRelayQuery as ScriptFiltersRefreshQueryType } from '@/__generated__/scriptFiltersRefreshRelayQuery.graphql';
import type { scriptsTableRelay_query$key as ScriptsFragmentKey } from '@/__generated__/scriptsTableRelay_query.graphql';
import type { scriptsTableRelayPaginationQuery as ScriptsPaginationQueryType } from '@/__generated__/scriptsTableRelayPaginationQuery.graphql';
import type {
  ScriptFilterInput,
  scriptsTableRelayQuery as ScriptsTableQueryType,
} from '@/__generated__/scriptsTableRelayQuery.graphql';
import type { scriptTagsRelayFilterQuery as ScriptTagsFilterQueryType } from '@/__generated__/scriptTagsRelayFilterQuery.graphql';
import type { unarchiveScriptMutation as UnarchiveScriptMutationType } from '@/__generated__/unarchiveScriptMutation.graphql';
import { useAskMingo } from '@/app/(app)/mingo/hooks/use-ask-mingo';
import { employeeDetailHref } from '@/app/(app)/settings/employees/routes';
import { EmptyState } from '@/app/components/shared';
import { useDeferredQuery } from '@/app/hooks/use-deferred-query';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { ScriptStatus } from '@/generated/schema-enums';
import { archiveScriptMutation } from '@/graphql/scripts/archive-script-mutation';
import { scriptFiltersRefreshRelayQuery } from '@/graphql/scripts/script-filters-refresh-relay';
import { scriptTagsRelayFilterQuery } from '@/graphql/scripts/script-tags-relay';
import { scriptsTableRelayFragment, scriptsTableRelayQuery } from '@/graphql/scripts/scripts-table-relay';
import { unarchiveScriptMutation } from '@/graphql/scripts/unarchive-script-mutation';
import { getFullImageUrl } from '@/lib/image-url';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { decodeGlobalId } from '@/lib/relay-id';
import { routes } from '@/lib/routes';
import { initiatorInitials, initiatorName } from '../utils/execution-helpers';
import { facetToSortedOptions } from '../utils/facet-options';
import { platformsToEnums, platformsToIds, shellToEnum, shellToId } from '../utils/script-mappers';
import { ArchiveScriptModal } from './archive-script-modal';
import { RestoreScriptModal } from './restore-script-modal';
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

// ----------------------------------------------------------------
// Inner content — Relay hooks, must live inside Suspense
// ----------------------------------------------------------------

interface ScriptsTableContentProps {
  backendFilters: ScriptFilterInput;
  debouncedSearch: string;
  tableFilters: Record<string, string[]>;
  /** Whether any tag filter is active (kept out of `tableFilters` so it doesn't become a phantom column filter). */
  hasTagFilter: boolean;
  /**
   * True while the deferred query variables lag the live filter/search state
   * (a refetch is in flight and the rows on screen are the previous result) —
   * guards the empty state so it never flashes on stale data.
   */
  isPending: boolean;
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
  isPending,
  onFilterChange,
  onEmptyChange,
  mobileFilterOpen,
  onMobileFilterClose,
  stickyHeaderOffset,
  archived,
}: ScriptsTableContentProps) {
  const askMingo = useAskMingo();
  const { toast } = useToast();
  const environment = useRelayEnvironment();

  const [commitArchive, isArchiving] = useMutation<ArchiveScriptMutationType>(archiveScriptMutation);
  const [commitUnarchive, isUnarchiving] = useMutation<UnarchiveScriptMutationType>(unarchiveScriptMutation);

  // Script whose archive/restore is awaiting confirmation in the modal (null = closed).
  const [confirmTarget, setConfirmTarget] = useState<UiScriptEntry | null>(null);

  // One round-trip per interaction: the filter facets (`scriptFilters`) ride the
  // list operation — see the query docstring for the facet semantics.
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

  // This list's connection record id — handed to archive/unarchive's `@deleteEdge`
  // so the mutated script's edge is removed from THIS list (the record itself is
  // kept in the store, so the chat / detail page can still fetch it by id).
  const connectionId = data.scripts?.__id;

  const transformedScripts: UiScriptEntry[] = useMemo(() => {
    const edges = data.scripts?.edges ?? [];
    // Defensive null-edge/node guard. Archive/unarchive use `@deleteEdge` (removes
    // the edge from this connection but keeps the record), so a null `node` isn't
    // expected here — but skipping any dangling edge keeps the map crash-proof.
    return edges.flatMap(edge => {
      const node = edge?.node;
      if (!node) return [];
      return [
        {
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
        },
      ];
    });
  }, [data.scripts?.edges]);

  const fetchNextPage = useCallback(() => {
    if (hasNext && !isLoadingNext) {
      loadNext(PAGE_SIZE);
    }
  }, [hasNext, isLoadingNext, loadNext]);

  // Filter options — all server-driven (the complete set for this scope), so
  // values a paginated list couldn't enumerate still appear. Shell/platform
  // option `value`s are mapped from the backend enum to the UI id the table's
  // column filter + `backendFilters` already use; author `value` is the user id.
  const shellOptions = useMemo(
    () =>
      (queryData.scriptFilters?.shells ?? []).map(s => {
        const id = shellToId(s.value);
        return { id, label: s.label, value: id };
      }),
    [queryData.scriptFilters?.shells],
  );

  const platformOptions = useMemo(
    () =>
      (queryData.scriptFilters?.platforms ?? [])
        .map(p => {
          const id = platformsToIds([p.value])[0];
          return id ? { id, label: p.label, value: id } : null;
        })
        .filter((o): o is { id: string; label: string; value: string } => o !== null),
    [queryData.scriptFilters?.platforms],
  );

  const authorOptions = useMemo(
    () => facetToSortedOptions(queryData.scriptFilters?.authors),
    [queryData.scriptFilters?.authors],
  );

  const renderRowActions = useCallback(
    (script: UiScriptEntry) => {
      const runHref = routes.scriptsV2.run(script.id);
      const editHref = routes.scriptsV2.edit(script.id);
      const newTabIcon = <ArrowRightUpIcon className="w-5 h-5 text-ods-text-secondary" />;
      const mutating = isArchiving || isUnarchiving;

      // Archive (active list) ↔ Unarchive (archived list). The action only opens a
      // confirmation modal; the mutation runs on confirm (see `handleConfirmArchive`).
      const archiveAction = {
        id: archived ? 'unarchive-script' : 'archive-script',
        label: archived ? 'Unarchive Script' : 'Archive Script',
        icon: <BoxArchiveIcon className="w-6 h-6 text-ods-text-secondary" />,
        disabled: mutating,
        onClick: () => setConfirmTarget(script),
      };

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
            archiveAction,
          ],
        },
      ];

      return <ActionsMenuDropdown groups={groups} />;
    },
    [archived, isArchiving, isUnarchiving],
  );

  // Runs the archive/unarchive mutation for the script the confirm modal targets.
  // `@deleteEdge` removes the row's edge from THIS list's connection (record kept
  // in store); the `updater` invalidates the record so EVERY OTHER cached
  // connection still holding its edge (other filter/search variants, the Mingo
  // picker) is marked stale and refetches on next read — independent of fetch
  // policy (works even under `store-or-network`). The current connection no longer
  // Archiving/unarchiving changes the list's MEMBERSHIP, so the derived filter
  // metadata goes stale: the shell/platform/author facets and the tag-filter
  // chips may still offer values whose last script just left this scope.
  // Re-fetch both imperatively into the store (`fetchQuery(...).subscribe({})` —
  // every mounted subscriber re-renders); the list itself is NOT refetched, the
  // `@deleteEdge` already updated it locally. `backendFilters` is the exact
  // variables value of the mounted list query, so the facet payload lands in the
  // same store records its dropdowns read from.
  const refreshFilterMeta = useCallback(() => {
    fetchQuery<ScriptFiltersRefreshQueryType>(
      environment,
      scriptFiltersRefreshRelayQuery,
      { filter: backendFilters },
      { fetchPolicy: 'network-only' },
    ).subscribe({});
    fetchQuery<ScriptTagsFilterQueryType>(
      environment,
      scriptTagsRelayFilterQuery,
      { archived: archived ? true : null },
      { fetchPolicy: 'network-only' },
    ).subscribe({});
  }, [environment, backendFilters, archived]);

  // references the node (edge already removed), so it isn't refetched. Modal closes
  // once the mutation settles (parent owns `open`, so pending state stays visible).
  const handleConfirmArchive = useCallback(() => {
    if (!confirmTarget) return;
    const { id, name } = confirmTarget;
    const connections = connectionId ? [connectionId] : [];
    const updater = (store: RecordSourceSelectorProxy) => store.get(id)?.invalidateRecord();
    const commit = archived ? commitUnarchive : commitArchive;
    commit({
      variables: { id, connections },
      updater,
      onCompleted: () => {
        toast(
          archived
            ? { title: 'Script unarchived', description: `"${name}" was moved back to Scripts.`, variant: 'success' }
            : {
                title: 'Script archived',
                description: `"${name}" was moved to Archived Scripts.`,
                variant: 'success',
              },
        );
        setConfirmTarget(null);
        refreshFilterMeta();
      },
      onError: error => {
        toast({
          title: 'Error',
          description: error.message || `Failed to ${archived ? 'unarchive' : 'archive'} script`,
          variant: 'destructive',
        });
        setConfirmTarget(null);
      },
    });
  }, [confirmTarget, connectionId, archived, commitArchive, commitUnarchive, toast, refreshFilterMeta]);

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
          filter: { options: shellOptions },
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
          filter: { options: platformOptions },
        },
      },
      {
        // "Added by" = Script.author. Server filter via `authorIds`; the dropdown
        // options come from `scriptFilters.authors` (see authorOptions). accessorKey
        // is `authorId` so the option values (ids) match the server filter.
        accessorKey: 'authorId',
        header: 'Added by',
        // The author id is a User global id; decode it to the raw id the REST-backed
        // employee page expects. The whole cell opens that user's page in a new tab
        // (accent + underline). `data-no-row-click` stops the row's own navigation
        // (to the script) so only the user page opens.
        cell: ({ row }: { row: Row<UiScriptEntry> }) => {
          if (!row.original.hasAuthor) {
            return (
              <div className="flex flex-1 items-center min-w-0">
                <TruncateText tone="secondary">—</TruncateText>
              </div>
            );
          }
          const rawAuthorId = row.original.authorId
            ? (decodeGlobalId(row.original.authorId)?.rawId ?? row.original.authorId)
            : '';
          const href = rawAuthorId ? employeeDetailHref(rawAuthorId) : null;
          const avatar = (
            <SquareAvatar
              variant="round"
              size="sm"
              src={row.original.authorImage}
              fallback={row.original.authorInitials}
              alt={row.original.authorName}
              initialsClassName="text-ods-text-secondary"
            />
          );
          if (!href) {
            return (
              <div className="flex flex-1 items-center gap-2 min-w-0">
                {avatar}
                {/* min-w-0 flex-1 wrapper so the FloatingTooltip's block div can shrink and the name ellipsizes. */}
                <div className="min-w-0 flex-1">
                  <TruncateText>{row.original.authorName}</TruncateText>
                </div>
              </div>
            );
          }
          return (
            <div data-no-row-click className="flex min-w-0 flex-1 pointer-events-auto">
              <button
                type="button"
                onClick={openInNewTab(href)}
                className="flex w-full items-center gap-2 min-w-0 text-left"
              >
                {avatar}
                {/* min-w-0 flex-1 wrapper so the FloatingTooltip's block div can shrink and the name ellipsizes. */}
                <div className="min-w-0 flex-1">
                  <TruncateText className="text-ods-accent underline">{row.original.authorName}</TruncateText>
                </div>
              </button>
            </div>
          );
        },
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        // Rightmost filterable column: anchor the dropdown to the right edge so it
        // never flips placement (start↔end) on open/close — that flip makes the
        // panel jump sideways as it animates out.
        meta: {
          width: 'w-[250px]',
          hideAt: 'lg',
          cellClassName: 'self-stretch',
          filter: { options: authorOptions, placement: 'bottom-end' },
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
              onClick={openInNewTab(routes.scriptsV2.details(row.original.id))}
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
    [renderRowActions, shellOptions, platformOptions, authorOptions],
  );

  const filterGroups = useMemo(
    () => [
      { id: 'shellType', title: 'Shell Type', options: shellOptions },
      { id: 'supportedPlatforms', title: 'OS', options: platformOptions },
      { id: 'authorId', title: 'Added by', options: authorOptions },
    ],
    [shellOptions, platformOptions, authorOptions],
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

  const scriptRowHref = useCallback((script: UiScriptEntry) => routes.scriptsV2.details(script.id), []);

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
      {/* Dim (don't unmount) the stale rows while a deferred refetch is in
          flight — the subtle fade is the pending feedback. Swapping to skeletons
          is exactly the flash the deferral avoids. */}
      <div className={`transition-opacity duration-200 ${isPending ? 'opacity-60' : ''}`}>
        <DataTable table={table}>
          <DataTable.Header stickyHeader stickyHeaderOffset={stickyHeaderOffset} rightSlot={<DataTable.RowCount />} />
          <DataTable.Body
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
      </div>

      <FilterModal
        isOpen={mobileFilterOpen}
        onClose={onMobileFilterClose}
        filterGroups={filterGroups}
        onFilterChange={onFilterChange}
        currentFilters={tableFilters}
      />

      {archived ? (
        <RestoreScriptModal
          open={confirmTarget !== null}
          onOpenChange={open => !open && setConfirmTarget(null)}
          onConfirm={handleConfirmArchive}
          isPending={isUnarchiving}
        />
      ) : (
        <ArchiveScriptModal
          open={confirmTarget !== null}
          onOpenChange={open => !open && setConfirmTarget(null)}
          onConfirm={handleConfirmArchive}
          isPending={isArchiving}
        />
      )}
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
  const handleBack = useSafeBack(routes.scriptsV2.list);

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

  // Deferred query variables: on a filter/search interaction the table keeps
  // rendering the current rows while the refetch is in flight, instead of
  // dropping to the Suspense skeleton. The dropdown state (`tableFilters`) stays
  // live so the checkboxes respond instantly.
  const { deferredFilters, deferredSearch, isPending } = useDeferredQuery(backendFilters, debouncedSearch);

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
    router.push(routes.scriptsV2.new);
  }, [router]);

  const handleOpenArchive = useCallback(() => {
    router.push(routes.scriptsV2.archived);
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
            className="sticky top-0 z-20 flex flex-col gap-[var(--spacing-system-xxs)] bg-ods-bg -mx-[var(--spacing-system-l)] px-[var(--spacing-system-l)] pt-[var(--spacing-system-l)] pb-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]"
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
                archived={archived}
              />
            </Suspense>
          </div>
        )}

        <Suspense fallback={<ScriptsTableSkeleton stickyHeaderOffset={stickyHeaderOffset} />}>
          <ScriptsTableContent
            backendFilters={deferredFilters}
            debouncedSearch={deferredSearch}
            tableFilters={tableFilters}
            hasTagFilter={params.tagIds.length > 0}
            isPending={isPending}
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
