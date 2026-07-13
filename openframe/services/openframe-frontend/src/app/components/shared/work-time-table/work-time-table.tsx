'use client';

import { ErrorBoundary } from '@flamingo-stack/openframe-frontend-core/components/features';
import { PenEditIcon, SearchIcon, TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  type ColumnFiltersState,
  DashboardInfoCard,
  DataTable,
  type DataTableFilterOption,
  DatePicker,
  type DateRange,
  EntityImage,
  Input,
  LoadError,
  type OnChangeFn,
  Skeleton,
  SquareAvatar,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { format, isValid, parseISO } from 'date-fns';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useLazyLoadQuery, useMutation, usePaginationFragment } from 'react-relay';
import type { deleteTimeEntryMutation as DeleteTimeEntryMutationType } from '@/__generated__/deleteTimeEntryMutation.graphql';
import type { employeeWorkTimeRelay_query$key } from '@/__generated__/employeeWorkTimeRelay_query.graphql';
import type { employeeWorkTimeRelayPaginationQuery } from '@/__generated__/employeeWorkTimeRelayPaginationQuery.graphql';
import type { employeeWorkTimeRelayQuery as EmployeeWorkTimeRelayQueryType } from '@/__generated__/employeeWorkTimeRelayQuery.graphql';
import { useAssigneeOptions, useOrganizationOptions } from '@/app/(app)/tickets/hooks/use-ticket-options';
import { type ManualEntryEditTarget, ManualEntryModal } from '@/app/components/manual-entry-modal';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { deleteTimeEntryMutation } from '@/graphql/time-tracker/delete-time-entry-mutation';
import {
  employeeWorkTimeRelayFragment,
  employeeWorkTimeRelayQuery,
} from '@/graphql/time-tracker/employee-work-time-relay';
import {
  formatDurationLabel,
  makeDeleteTimeEntryUpdater,
  parseInstant,
  subscribeTimeEntriesChanged,
  toInstantRange,
  toOrganizationGlobalId,
} from '@/graphql/time-tracker/time-tracker-helpers';
import { formatDate } from '@/lib/format-date';
import { getFullImageUrl } from '@/lib/image-url';
import { decodeGlobalId, ensureGlobalIdForType } from '@/lib/relay-id';

const PAGE_SIZE = 20;
const EMPTY_ROWS: WorkTimeRow[] = [];
const noop = () => {};
const DAY_PARAM_FORMAT = 'yyyy-MM-dd';

function formatDayParam(date: Date | undefined): string | null {
  return date ? format(date, DAY_PARAM_FORMAT) : null;
}

function rangeFromParams(from: string, to: string): DateRange | undefined {
  const fromDate = from ? parseISO(from) : undefined;
  if (!fromDate || !isValid(fromDate)) return undefined;
  const toDate = to ? parseISO(to) : undefined;
  return { from: fromDate, to: toDate && isValid(toDate) ? toDate : undefined };
}

interface WorkTimeRow {
  id: string;
  durationSeconds: number;
  startedAt: unknown;
  ticketId: string | null;
  ticketNumber: number | null;
  ticketTitle: string | null;
  notes: string | null;
  /** Raw user id (matches assignee-option values), for editing/reassigning the employee. */
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userImageUrl?: string;
  organizationId: string | null;
  organizationName: string | null;
  organizationEmail: string | null;
  organizationImageUrl?: string;
}

interface WorkTimeFilter {
  employeeIds: string[] | null;
  organizationIds: string[] | null;
  startedFrom: string | null;
  startedTo: string | null;
}

interface QueryVars {
  filter: WorkTimeFilter;
  search: string | null;
  first: number;
  after: string | null;
}

const employeeColumn: ColumnDef<WorkTimeRow> = {
  id: 'employee',
  header: 'EMPLOYEE',
  cell: ({ row }) => (
    <div className="flex min-w-0 items-center gap-[var(--spacing-system-xs)]">
      <SquareAvatar src={row.original.userImageUrl} fallback={row.original.userName ?? '?'} size="sm" variant="round" />
      <div className="flex min-w-0 flex-col">
        <TruncateText>{row.original.userName ?? '–'}</TruncateText>
        {row.original.userEmail && (
          <TruncateText variant="h6" tone="secondary" mono>
            {row.original.userEmail}
          </TruncateText>
        )}
      </div>
    </div>
  ),
  enableSorting: false,
  meta: { width: 'min-w-0 flex-1' },
};

const timeColumn: ColumnDef<WorkTimeRow> = {
  id: 'time',
  header: 'TIME',
  cell: ({ row }) => (
    <div className="flex flex-col">
      <span className="font-mono text-h4 text-ods-text-primary">
        {formatDurationLabel(row.original.durationSeconds)}
      </span>
      <span className="text-h6 text-ods-text-secondary">{formatDate(parseInstant(row.original.startedAt))}</span>
    </div>
  ),
  enableSorting: false,
  meta: { width: 'w-24 md:w-32 shrink-0 flex-none' },
};

const customerColumn: ColumnDef<WorkTimeRow> = {
  id: 'customer',
  header: 'CUSTOMER',
  cell: ({ row }) => {
    const { organizationName, organizationEmail, organizationImageUrl } = row.original;
    if (!organizationName) return <span className="text-h4 text-ods-text-secondary">–</span>;
    return (
      <div className="flex min-w-0 items-center gap-[var(--spacing-system-xs)]">
        <EntityImage src={organizationImageUrl} alt={organizationName} className="size-12 md:size-12" />
        <div className="flex min-w-0 flex-col">
          <TruncateText>{organizationName}</TruncateText>
          {organizationEmail && (
            <TruncateText variant="h6" tone="secondary" mono>
              {organizationEmail}
            </TruncateText>
          )}
        </div>
      </div>
    );
  },
  enableSorting: false,
  meta: { width: 'min-w-0 flex-1', hideAt: 'md' },
};

const ticketNotesColumn: ColumnDef<WorkTimeRow> = {
  id: 'ticketNotes',
  header: 'TICKET & NOTES',
  cell: ({ row }) => {
    const { ticketNumber, ticketTitle, notes } = row.original;
    const ticketLabel = ticketTitle ? `${ticketNumber != null ? `${ticketNumber} – ` : ''}${ticketTitle}` : '–';
    return (
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-h4 text-ods-text-primary">{ticketLabel}</span>
        {notes && <span className="truncate text-h6 text-ods-text-secondary">{notes}</span>}
      </div>
    );
  },
  enableSorting: false,
  meta: { width: 'min-w-0 flex-1', hideAt: 'md' },
};

function buildColumns(
  showEmployee: boolean,
  showCustomer: boolean,
  onEdit: (row: WorkTimeRow) => void,
  onDelete: (row: WorkTimeRow) => void,
  employeeFilterOptions: DataTableFilterOption[] = [],
  customerFilterOptions: DataTableFilterOption[] = [],
): ColumnDef<WorkTimeRow>[] {
  const actionsColumn: ColumnDef<WorkTimeRow> = {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-[var(--spacing-system-xs)]">
        <Button
          variant="outline"
          size="icon"
          className="bg-ods-card"
          aria-label="Delete Entry"
          leftIcon={<TrashIcon className="h-5 w-5 text-ods-error" />}
          onClick={() => onDelete(row.original)}
        />
        <Button
          variant="outline"
          size="icon"
          className="bg-ods-card"
          aria-label="Edit Entry"
          leftIcon={<PenEditIcon className="h-5 w-5" />}
          onClick={() => onEdit(row.original)}
        />
      </div>
    ),
    enableSorting: false,
    meta: { width: 'w-24 md:w-28 shrink-0 flex-none', align: 'right' },
  };

  return [
    ...(showEmployee
      ? [
          {
            ...employeeColumn,
            meta: {
              ...employeeColumn.meta,
              filter: employeeFilterOptions.length ? { options: employeeFilterOptions } : undefined,
            },
          },
        ]
      : []),
    timeColumn,
    ...(showCustomer
      ? [
          {
            ...customerColumn,
            meta: {
              ...customerColumn.meta,
              filter: customerFilterOptions.length ? { options: customerFilterOptions } : undefined,
            },
          },
        ]
      : []),
    ticketNotesColumn,
    actionsColumn,
  ];
}

function mapUserName(
  user: { firstName?: string | null; lastName?: string | null; email?: string | null } | null | undefined,
) {
  if (!user) return null;
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return name || user.email || null;
}

function WorkTimeTableData({
  showEmployee,
  showCustomer,
  vars,
  fetchKey,
  onEdit,
  onDelete,
  employeeFilterOptions,
  customerFilterOptions,
  columnFilters,
  onColumnFiltersChange,
}: {
  showEmployee: boolean;
  showCustomer: boolean;
  vars: QueryVars;
  fetchKey: number;
  onEdit: (row: WorkTimeRow) => void;
  onDelete: (row: WorkTimeRow) => void;
  employeeFilterOptions: DataTableFilterOption[];
  customerFilterOptions: DataTableFilterOption[];
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
}) {
  const queryData = useLazyLoadQuery<EmployeeWorkTimeRelayQueryType>(employeeWorkTimeRelayQuery, vars, {
    fetchPolicy: 'store-and-network',
    fetchKey,
  });
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment<
    employeeWorkTimeRelayPaginationQuery,
    employeeWorkTimeRelay_query$key
  >(employeeWorkTimeRelayFragment, queryData);

  const stats = queryData.employeeTimeStats;
  const totalCount = data.employeeTimeEntries.filteredCount;

  const rows = useMemo<WorkTimeRow[]>(
    () =>
      data.employeeTimeEntries.edges
        .filter(edge => edge.node != null)
        .map(edge => {
          const org = edge.node.organization;
          return {
            id: edge.node.id,
            durationSeconds: Number(edge.node.durationSeconds),
            startedAt: edge.node.startedAt,
            ticketId: edge.node.ticketId ?? null,
            ticketNumber: edge.node.ticketNumber ?? null,
            ticketTitle: edge.node.ticketTitle ?? null,
            notes: edge.node.notes ?? null,
            userId: edge.node.user?.id ? (decodeGlobalId(edge.node.user.id)?.rawId ?? edge.node.user.id) : null,
            userName: mapUserName(edge.node.user),
            userEmail: edge.node.user?.email ?? null,
            userImageUrl: getFullImageUrl(edge.node.user?.image?.imageUrl, edge.node.user?.image?.hash),
            organizationId: org?.organizationId ?? null,
            organizationName: org?.name ?? null,
            organizationEmail: org?.contactInformation?.contacts?.[0]?.email ?? null,
            organizationImageUrl: getFullImageUrl(org?.image?.imageUrl, org?.image?.hash),
          };
        }),
    [data.employeeTimeEntries.edges],
  );

  const columns = useMemo(
    () => buildColumns(showEmployee, showCustomer, onEdit, onDelete, employeeFilterOptions, customerFilterOptions),
    [showEmployee, showCustomer, onEdit, onDelete, employeeFilterOptions, customerFilterOptions],
  );
  const table = useDataTable<WorkTimeRow>({
    data: rows,
    columns,
    getRowId: row => row.id,
    enableSorting: false,
    state: { columnFilters },
    onColumnFiltersChange,
  });

  return (
    <>
      <div className="flex flex-col gap-[var(--spacing-system-m)] md:flex-row">
        <DashboardInfoCard
          className="flex-1"
          title="TODAY TOTAL"
          value={formatDurationLabel(Number(stats.todayTotalSeconds))}
          subValue={`${stats.todayEntryCount} entries`}
          valueClassName="font-mono"
        />
        <DashboardInfoCard
          className="flex-1"
          title="PERIOD TOTAL"
          value={formatDurationLabel(Number(stats.periodTotalSeconds))}
          subValue={`${stats.periodEntryCount} entries`}
          valueClassName="font-mono"
        />
        <DashboardInfoCard
          className="flex-1"
          title="AVG. PER DAY"
          value={formatDurationLabel(Number(stats.averagePerDaySeconds))}
          valueClassName="font-mono"
        />
      </div>

      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount itemName="result" totalCount={totalCount} />} />
        <DataTable.Body emptyMessage="No work time entries for this period." />
        <DataTable.InfiniteFooter
          hasNextPage={hasNext}
          isFetchingNextPage={isLoadingNext}
          onLoadMore={() => loadNext(PAGE_SIZE)}
          skeletonRows={2}
        />
      </DataTable>
    </>
  );
}

function WorkTimeTableSkeleton({ showEmployee, showCustomer }: { showEmployee: boolean; showCustomer: boolean }) {
  const columns = useMemo(() => buildColumns(showEmployee, showCustomer, noop, noop), [showEmployee, showCustomer]);
  const table = useDataTable<WorkTimeRow>({
    data: EMPTY_ROWS,
    columns,
    getRowId: row => row.id,
    enableSorting: false,
  });

  return (
    <>
      <div className="flex flex-col gap-[var(--spacing-system-m)] md:flex-row">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="flex flex-1 items-center gap-[var(--spacing-system-s)] rounded-sm border border-ods-border bg-ods-card p-[var(--spacing-system-m)]"
          >
            <div className="flex flex-1 flex-col gap-[var(--spacing-system-xs)]">
              <Skeleton className="h-3 w-20 rounded-sm" />
              <Skeleton className="h-7 w-28 rounded-sm" />
            </div>
          </div>
        ))}
      </div>

      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount itemName="result" />} />
        <DataTable.Body loading skeletonRows={8} />
      </DataTable>
    </>
  );
}

export interface WorkTimeTableProps {
  /** Scope to one employee (employee details page). Raw user id — encoded to a global id internally. */
  employeeId?: string;
  /** Scope to one customer (customer details Worktime tab). Must be the org's Relay global id. */
  organizationGlobalId?: string;
  /** Show the Employee column (who logged the time). */
  showEmployee?: boolean;
  /** Show the Customer column (which organization the time is for). */
  showCustomer?: boolean;
  /**
   * Controlled "Add Work Time" modal — the trigger lives in the page/section header.
   * Omit both to render a display-only table without an add affordance.
   */
  addWorkTimeOpen?: boolean;
  onAddWorkTimeOpenChange?: (open: boolean) => void;
  /** Pre-select + lock this customer in the "Add Work Time" modal. Memoize to keep it stable. */
  addDefaultCustomer?: { id: string; label: string; imageUrl?: string };
}

/**
 * Stats + search/date filters + paginated time-entry table + edit/delete (and optional
 * add) modals. Shared by the employee details page (single employee), the tenant Worktime
 * page (all users, Employee + Customer columns), and the customer details Worktime tab
 * (one customer, Employee column). The header/title and the "Add Work Time" trigger are
 * owned by the caller; this owns the data and the modals.
 */
export function WorkTimeTable({
  employeeId,
  organizationGlobalId,
  showEmployee = false,
  showCustomer = false,
  addWorkTimeOpen,
  onAddWorkTimeOpenChange,
  addDefaultCustomer,
}: WorkTimeTableProps) {
  const { toast } = useToast();

  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    employeeIds: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
    from: { type: 'string', default: '' },
    to: { type: 'string', default: '' },
  });
  const { search, setSearch, debouncedSearch } = useSearchParam(params.search, value => setParam('search', value), 300);

  const [range, setRangeState] = useState<DateRange | undefined>(() => rangeFromParams(params.from, params.to));
  const setRange = useCallback(
    (next: DateRange | undefined) => {
      setRangeState(next);
      setParams({ from: formatDayParam(next?.from), to: formatDayParam(next?.to) });
    },
    [setParams],
  );
  useEffect(() => {
    setRangeState(prev => {
      if ((formatDayParam(prev?.from) ?? '') === params.from && (formatDayParam(prev?.to) ?? '') === params.to) {
        return prev;
      }
      return rangeFromParams(params.from, params.to);
    });
  }, [params.from, params.to]);

  const [editTarget, setEditTarget] = useState<ManualEntryEditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkTimeRow | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const [deleteEntry, isDeleting] = useMutation<DeleteTimeEntryMutationType>(deleteTimeEntryMutation);

  const employeeFilterIds = params.employeeIds;
  const customerFilterIds = params.organizationIds;

  const { options: employeeOptionsRaw } = useAssigneeOptions(showEmployee);
  const { options: customerOptionsRaw } = useOrganizationOptions('', showCustomer);

  const employeeFilterOptions = useMemo<DataTableFilterOption[]>(
    () => employeeOptionsRaw.map(option => ({ id: option.value, label: option.label, value: option.value })),
    [employeeOptionsRaw],
  );
  const customerFilterOptions = useMemo<DataTableFilterOption[]>(
    () => customerOptionsRaw.map(option => ({ id: option.value, label: option.label, value: option.value })),
    [customerOptionsRaw],
  );

  const columnFilters = useMemo<ColumnFiltersState>(
    () => [
      ...(employeeFilterIds.length ? [{ id: 'employee', value: employeeFilterIds }] : []),
      ...(customerFilterIds.length ? [{ id: 'customer', value: customerFilterIds }] : []),
    ],
    [employeeFilterIds, customerFilterIds],
  );

  const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
    updater => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater;
      const byId = Object.fromEntries(next.map(entry => [entry.id, entry.value as string[]]));
      setParams({ employeeIds: byId.employee ?? [], organizationIds: byId.customer ?? [] });
    },
    [columnFilters, setParams],
  );

  const filter = useMemo<WorkTimeFilter>(() => {
    const dateRange = range?.from ? toInstantRange(range.from, range.to ?? range.from) : null;
    const employeeIds = employeeId
      ? [ensureGlobalIdForType('User', employeeId)]
      : employeeFilterIds.length
        ? employeeFilterIds.map(id => ensureGlobalIdForType('User', id))
        : null;
    const organizationIds = organizationGlobalId
      ? [organizationGlobalId]
      : customerFilterIds.length
        ? customerFilterIds.map(id => toOrganizationGlobalId(id)).filter((id): id is string => id != null)
        : null;
    return {
      employeeIds,
      organizationIds,
      startedFrom: dateRange?.startedFrom ?? null,
      startedTo: dateRange?.startedTo ?? null,
    };
  }, [employeeId, organizationGlobalId, employeeFilterIds, customerFilterIds, range]);

  const vars = useMemo<QueryVars>(
    () => ({ filter, search: debouncedSearch || null, first: PAGE_SIZE, after: null }),
    [filter, debouncedSearch],
  );

  const [fetchKey, setFetchKey] = useState(0);
  const refresh = useCallback(() => setFetchKey(key => key + 1), []);

  useEffect(
    () =>
      subscribeTimeEntriesChanged(changedUserId => {
        if (!employeeId || changedUserId === employeeId) refresh();
      }),
    [employeeId, refresh],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteEntry({
      variables: { id: deleteTarget.id },
      updater: makeDeleteTimeEntryUpdater(deleteTarget.id),
      onCompleted: () => {
        toast({ title: 'Time entry deleted', variant: 'success' });
        setDeleteTarget(null);
        refresh();
      },
      onError: err => {
        toast({ title: 'Failed to delete time entry', description: err.message, variant: 'destructive' });
      },
    });
  }, [deleteTarget, deleteEntry, refresh, toast]);

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      <div className="flex flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-start">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search for Work Time"
          startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
          className="w-full md:flex-1"
        />
        <DatePicker
          mode="range"
          value={range}
          onChange={setRange}
          formatDate={formatDate}
          numberOfMonths={2}
          placeholder="Select dates"
          className="md:w-[276px]"
        />
      </div>

      <ErrorBoundary
        key={retryNonce}
        fallback={
          <LoadError message="Couldn't load work time entries." onRetry={() => setRetryNonce(nonce => nonce + 1)} />
        }
      >
        <Suspense fallback={<WorkTimeTableSkeleton showEmployee={showEmployee} showCustomer={showCustomer} />}>
          <WorkTimeTableData
            showEmployee={showEmployee}
            showCustomer={showCustomer}
            vars={vars}
            fetchKey={fetchKey}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
            employeeFilterOptions={employeeFilterOptions}
            customerFilterOptions={customerFilterOptions}
            columnFilters={columnFilters}
            onColumnFiltersChange={onColumnFiltersChange}
          />
        </Suspense>
      </ErrorBoundary>

      {onAddWorkTimeOpenChange && (
        <ManualEntryModal
          isOpen={!!addWorkTimeOpen}
          onClose={() => onAddWorkTimeOpenChange(false)}
          userId={employeeId}
          selectableUser={!employeeId}
          defaultCustomer={addDefaultCustomer}
          onSuccess={refresh}
        />
      )}
      <ManualEntryModal
        isOpen={!!editTarget}
        entry={editTarget}
        userId={employeeId}
        selectableUser={!employeeId}
        onClose={() => setEditTarget(null)}
        onSuccess={refresh}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Entry"
        description={
          deleteTarget ? (
            <>
              <span className="text-ods-error">{formatDurationLabel(deleteTarget.durationSeconds)}</span> logged on{' '}
              <span className="text-ods-error">{formatDate(parseInstant(deleteTarget.startedAt))}</span> will be
              permanently removed and subtracted from totals.
            </>
          ) : null
        }
        confirmLabel="Delete Entry"
        variant="destructive"
        isPending={isDeleting}
        pendingLabel="Deleting..."
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
