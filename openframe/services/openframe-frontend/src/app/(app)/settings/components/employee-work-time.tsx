'use client';

import { ErrorBoundary } from '@flamingo-stack/openframe-frontend-core/components/features';
import {
  PenEditIcon,
  PlusCircleIcon,
  SearchIcon,
  TrashIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DashboardInfoCard,
  DataTable,
  DatePicker,
  type DateRange,
  Input,
  LoadError,
  Skeleton,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useLazyLoadQuery, useMutation, usePaginationFragment } from 'react-relay';
import type { deleteTimeEntryMutation as DeleteTimeEntryMutationType } from '@/__generated__/deleteTimeEntryMutation.graphql';
import type { employeeWorkTimeRelay_query$key } from '@/__generated__/employeeWorkTimeRelay_query.graphql';
import type { employeeWorkTimeRelayPaginationQuery } from '@/__generated__/employeeWorkTimeRelayPaginationQuery.graphql';
import type { employeeWorkTimeRelayQuery as EmployeeWorkTimeRelayQueryType } from '@/__generated__/employeeWorkTimeRelayQuery.graphql';
import { type ManualEntryEditTarget, ManualEntryModal } from '@/app/components/manual-entry-modal';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { deleteTimeEntryMutation } from '@/graphql/time-tracker/delete-time-entry-mutation';
import {
  employeeWorkTimeRelayFragment,
  employeeWorkTimeRelayQuery,
} from '@/graphql/time-tracker/employee-work-time-relay';
import {
  type DateRangeInputValue,
  formatDurationLabel,
  makeDeleteTimeEntryUpdater,
  parseInstant,
  subscribeTimeEntriesChanged,
  toDateRangeInput,
} from '@/graphql/time-tracker/time-tracker-helpers';
import { formatDate } from '@/lib/format-date';
import { ensureGlobalIdForType } from '@/lib/relay-id';

const PAGE_SIZE = 20;
const EMPTY_ROWS: WorkTimeRow[] = [];
const noop = () => {};

interface WorkTimeRow {
  id: string;
  durationSeconds: number;
  startedAt: unknown;
  ticketId: string | null;
  ticketNumber: number | null;
  ticketTitle: string | null;
  notes: string | null;
}

function buildColumns(
  onEdit: (row: WorkTimeRow) => void,
  onDelete: (row: WorkTimeRow) => void,
): ColumnDef<WorkTimeRow>[] {
  return [
    {
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
      meta: { width: 'w-32 shrink-0 flex-none' },
    },
    {
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
    },
    {
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
      meta: { width: 'w-28 shrink-0 flex-none', align: 'right' },
    },
  ];
}

interface QueryVars {
  employeeId: string;
  period: DateRangeInputValue | null;
  search: string | null;
  first: number;
  after: string | null;
}

function EmployeeWorkTimeData({
  vars,
  fetchKey,
  onEdit,
  onDelete,
}: {
  vars: QueryVars;
  fetchKey: number;
  onEdit: (row: WorkTimeRow) => void;
  onDelete: (row: WorkTimeRow) => void;
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
        .map(edge => ({
          id: edge.node.id,
          durationSeconds: Number(edge.node.durationSeconds),
          startedAt: edge.node.startedAt,
          ticketId: edge.node.ticketId ?? null,
          ticketNumber: edge.node.ticketNumber ?? null,
          ticketTitle: edge.node.ticketTitle ?? null,
          notes: edge.node.notes ?? null,
        })),
    [data.employeeTimeEntries.edges],
  );

  const columns = useMemo(() => buildColumns(onEdit, onDelete), [onEdit, onDelete]);
  const table = useDataTable<WorkTimeRow>({ data: rows, columns, getRowId: row => row.id, enableSorting: false });

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

function EmployeeWorkTimeSkeleton() {
  const columns = useMemo(() => buildColumns(noop, noop), []);
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

export function EmployeeWorkTime({ userId }: { userId: string }) {
  const { toast } = useToast();

  const { params, setParam } = useApiParams({
    search: { type: 'string', default: '' },
  });
  const { search, setSearch, debouncedSearch } = useSearchParam(params.search, value => setParam('search', value), 300);
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManualEntryEditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkTimeRow | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const [deleteEntry, isDeleting] = useMutation<DeleteTimeEntryMutationType>(deleteTimeEntryMutation);

  const employeeId = useMemo(() => ensureGlobalIdForType('User', userId), [userId]);

  const period = useMemo<DateRangeInputValue | null>(() => {
    if (!range?.from) return null;
    return toDateRangeInput(range.from, range.to ?? range.from);
  }, [range]);

  const vars = useMemo<QueryVars>(
    () => ({
      employeeId,
      period,
      search: debouncedSearch || null,
      first: PAGE_SIZE,
      after: null,
    }),
    [employeeId, period, debouncedSearch],
  );

  const [fetchKey, setFetchKey] = useState(0);
  const refresh = useCallback(() => setFetchKey(key => key + 1), []);

  useEffect(
    () =>
      subscribeTimeEntriesChanged(changedUserId => {
        if (changedUserId === userId) refresh();
      }),
    [userId, refresh],
  );

  const handleEdit = useCallback((row: WorkTimeRow) => setEditTarget(row), []);

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
    <section className="flex flex-col pt-[var(--spacing-system-l)] gap-[var(--spacing-system-l)]">
      <div className="flex items-center justify-between gap-[var(--spacing-system-m)]">
        <h2 className="text-h2 text-ods-text-primary">Employee Work Time</h2>
        <Button
          variant="outline"
          onClick={() => setAddOpen(true)}
          leftIcon={<PlusCircleIcon className="h-5 w-5 text-ods-text-secondary" />}
        >
          Add Work Time
        </Button>
      </div>

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
        <Suspense fallback={<EmployeeWorkTimeSkeleton />}>
          <EmployeeWorkTimeData vars={vars} fetchKey={fetchKey} onEdit={handleEdit} onDelete={setDeleteTarget} />
        </Suspense>
      </ErrorBoundary>

      <ManualEntryModal isOpen={addOpen} onClose={() => setAddOpen(false)} userId={userId} onSuccess={refresh} />
      <ManualEntryModal
        isOpen={!!editTarget}
        entry={editTarget}
        userId={userId}
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
    </section>
  );
}
