'use client';

import {
  type TimeTrackerData,
  type TimeTrackerEntry,
  TimeTrackerProvider,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { type ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyLoadQuery, useMutation, usePaginationFragment } from 'react-relay';
import type { cancelTimerMutation as CancelTimerMutationType } from '@/__generated__/cancelTimerMutation.graphql';
import type { currentTimerRelayQuery as CurrentTimerRelayQueryType } from '@/__generated__/currentTimerRelayQuery.graphql';
import type { myTimeEntriesRelay_query$key as MyTimeEntriesFragmentKey } from '@/__generated__/myTimeEntriesRelay_query.graphql';
import type { myTimeEntriesRelayPaginationQuery as MyTimeEntriesPaginationQueryType } from '@/__generated__/myTimeEntriesRelayPaginationQuery.graphql';
import type { myTimeEntriesRelayQuery as MyTimeEntriesRelayQueryType } from '@/__generated__/myTimeEntriesRelayQuery.graphql';
import type { pauseTimerMutation as PauseTimerMutationType } from '@/__generated__/pauseTimerMutation.graphql';
import type { resumeTimerMutation as ResumeTimerMutationType } from '@/__generated__/resumeTimerMutation.graphql';
import type { startTimerMutation as StartTimerMutationType } from '@/__generated__/startTimerMutation.graphql';
import type { stopTimerMutation as StopTimerMutationType } from '@/__generated__/stopTimerMutation.graphql';
import { employeeDetailHref } from '@/app/(app)/settings/employees/routes';
import { type ManualEntryEditTarget, ManualEntryModal } from '@/app/components/manual-entry-modal';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { useTicketCustomerSelection } from '@/app/components/use-ticket-customer-selection';
import { TimerState } from '@/generated/schema-enums';
import { cancelTimerMutation } from '@/graphql/time-tracker/cancel-timer-mutation';
import { currentTimerRelayQuery } from '@/graphql/time-tracker/current-timer-relay';
import { myTimeEntriesRelayFragment, myTimeEntriesRelayQuery } from '@/graphql/time-tracker/my-time-entries-relay';
import { pauseTimerMutation } from '@/graphql/time-tracker/pause-timer-mutation';
import { resumeTimerMutation } from '@/graphql/time-tracker/resume-timer-mutation';
import { startTimerMutation } from '@/graphql/time-tracker/start-timer-mutation';
import { stopTimerMutation } from '@/graphql/time-tracker/stop-timer-mutation';
import {
  CLEAR_ORGANIZATION_ID,
  CLEAR_TICKET_ID,
  formatDurationLabel,
  makeCancelTimerUpdater,
  makeSetCurrentTimerUpdater,
  makeStopTimerUpdater,
  mapTimeEntryToLastEntry,
  mapTimerToTrackerState,
  notifyTimeEntriesChanged,
  type TimeEntryNodeShape,
  toOrganizationGlobalId,
  toTicketGlobalId,
} from '@/graphql/time-tracker/time-tracker-helpers';
import { useAuthStore } from '@/stores';

export function TimeTrackerHostProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  if (!enabled) return <>{children}</>;
  return <TimeTrackerHost>{children}</TimeTrackerHost>;
}

function TimeTrackerHost({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const router = useRouter();
  const currentUserId = useAuthStore(state => state.user?.id);

  const [timerNode, setTimerNode] = useState<TimeEntryNodeShape | null>(null);
  const [recentNodes, setRecentNodes] = useState<TimeEntryNodeShape[]>([]);
  const [notes, setNotes] = useState('');
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManualEntryEditTarget | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const {
    ticketId: selectedTicketId,
    customerId: selectedCustomerId,
    customerLocked,
    ticketOptions: ticketOptionsList,
    customerOptions: customerOptionsList,
    ticketsLoading,
    customersLoading,
    setTicketSearch,
    setCustomerSearch,
    selectTicket,
    selectCustomer,
    reset: resetTicketCustomer,
  } = useTicketCustomerSelection();

  const [startTimer, isStarting] = useMutation<StartTimerMutationType>(startTimerMutation);
  const [pauseTimer, isPausing] = useMutation<PauseTimerMutationType>(pauseTimerMutation);
  const [resumeTimer, isResuming] = useMutation<ResumeTimerMutationType>(resumeTimerMutation);
  const [stopTimer, isSubmitting] = useMutation<StopTimerMutationType>(stopTimerMutation);
  const [cancelTimer, isCancelling] = useMutation<CancelTimerMutationType>(cancelTimerMutation);

  const clock = useMemo(() => mapTimerToTrackerState(timerNode), [timerNode]);

  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !timerNode) return;
    if (timerNode.state === TimerState.RUNNING || timerNode.state === TimerState.PAUSED) {
      resetTicketCustomer({
        ticketId: timerNode.ticketId ?? null,
        ticketLabel: timerNode.ticketTitle ?? (timerNode.ticketNumber != null ? `#${timerNode.ticketNumber}` : null),
        customerId: timerNode.organizationId ?? null,
        customerLabel: timerNode.organization?.name ?? timerNode.ticket?.organizationName ?? null,
        // Locked only when ticket-derived; a customer picked without a ticket stays editable.
        lockCustomer: !!(timerNode.ticketId && timerNode.organizationId),
      });
      if (timerNode.notes) setNotes(timerNode.notes);
      seededRef.current = true;
    }
  }, [timerNode, resetTicketCustomer]);

  const ticketOptions = useMemo(
    () => ticketOptionsList.map(option => ({ id: option.value, label: option.label })),
    [ticketOptionsList],
  );

  const customerOptions = useMemo(
    () => customerOptionsList.map(option => ({ id: option.value, label: option.label, imageUrl: option.imageUrl })),
    [customerOptionsList],
  );

  const recentEntries = useMemo(() => recentNodes.map(mapTimeEntryToLastEntry), [recentNodes]);

  const resetDraft = useCallback(() => {
    resetTicketCustomer();
    setNotes('');
    seededRef.current = false;
  }, [resetTicketCustomer]);

  const onError = useCallback(
    (title: string) => (err: Error) => {
      toast({ title, description: err.message, variant: 'destructive' });
    },
    [toast],
  );

  const onStart = useCallback(() => {
    startTimer({
      variables: {
        input: {
          ticketId: toTicketGlobalId(selectedTicketId),
          organizationId: toOrganizationGlobalId(selectedCustomerId),
          notes: notes || null,
        },
      },
      updater: makeSetCurrentTimerUpdater('startTimer'),
      onError: onError('Failed to start timer'),
    });
  }, [startTimer, selectedTicketId, selectedCustomerId, notes, onError]);

  const onPause = useCallback(() => {
    pauseTimer({
      variables: {},
      updater: makeSetCurrentTimerUpdater('pauseTimer'),
      onError: onError('Failed to pause timer'),
    });
  }, [pauseTimer, onError]);

  const onResume = useCallback(() => {
    resumeTimer({
      variables: {},
      updater: makeSetCurrentTimerUpdater('resumeTimer'),
      onError: onError('Failed to resume timer'),
    });
  }, [resumeTimer, onError]);

  const onCancel = useCallback(() => {
    if (timerNode) setCancelConfirmOpen(true);
  }, [timerNode]);

  const confirmCancel = useCallback(() => {
    cancelTimer({
      variables: {},
      updater: timerNode ? makeCancelTimerUpdater(timerNode.id) : undefined,
      onCompleted: () => {
        resetDraft();
        setCancelConfirmOpen(false);
      },
      onError: onError('Failed to cancel timer'),
    });
  }, [cancelTimer, timerNode, resetDraft, onError]);

  const onSubmit = useCallback(() => {
    stopTimer({
      variables: {
        input: {
          ticketId: toTicketGlobalId(selectedTicketId) ?? CLEAR_TICKET_ID,
          organizationId: toOrganizationGlobalId(selectedCustomerId) ?? CLEAR_ORGANIZATION_ID,
          notes,
        },
      },
      updater: makeStopTimerUpdater(),
      onCompleted: () => {
        resetDraft();
        notifyTimeEntriesChanged(currentUserId ?? null);
      },
      onError: onError('Failed to save time entry'),
    });
  }, [stopTimer, selectedTicketId, selectedCustomerId, notes, resetDraft, onError, currentUserId]);

  const onEntriesChanged = useCallback(() => notifyTimeEntriesChanged(currentUserId ?? null), [currentUserId]);

  const onManualEntry = useCallback(() => setManualEntryOpen(true), []);

  const onOpenMyTime = useCallback(() => {
    if (currentUserId) router.push(employeeDetailHref(currentUserId));
  }, [router, currentUserId]);

  const onOpenMyTimeMenu = useCallback(() => {
    if (currentUserId) window.open(employeeDetailHref(currentUserId), '_blank', 'noopener,noreferrer');
  }, [currentUserId]);

  const onEntryClick = useCallback(
    (entry: TimeTrackerEntry) => {
      const node = recentNodes.find(candidate => candidate.id === entry.id);
      if (!node) return;
      setEditTarget({
        id: node.id,
        durationSeconds: Number(node.durationSeconds),
        startedAt: node.startedAt,
        ticketId: node.ticketId ?? null,
        ticketNumber: node.ticketNumber ?? null,
        ticketTitle: node.ticketTitle ?? null,
        organizationId: node.organizationId ?? null,
        organizationName: node.organization?.name ?? node.ticket?.organizationName ?? null,
        notes: node.notes ?? null,
      });
    },
    [recentNodes],
  );

  const trackerData = useMemo<TimeTrackerData>(
    () => ({
      status: clock.status,
      runningSince: clock.runningSince,
      accumulatedMs: clock.accumulatedMs,
      ticketOptions,
      selectedTicketId,
      onSelectedTicketChange: selectTicket,
      onTicketSearch: setTicketSearch,
      ticketsLoading,
      customerOptions,
      selectedCustomerId,
      onSelectedCustomerChange: selectCustomer,
      onCustomerSearch: setCustomerSearch,
      customersLoading,
      customerLocked,
      notes,
      onNotesChange: setNotes,
      lastEntries: recentEntries,
      onStart,
      onPause,
      onResume,
      onCancel,
      onSubmit,
      onManualEntry,
      onEntryClick,
      onOpenMyTime,
      onOpenMyTimeMenu,
      isStarting: isStarting || isPausing || isResuming,
      isSubmitting,
    }),
    [
      clock,
      ticketOptions,
      selectedTicketId,
      selectTicket,
      setTicketSearch,
      ticketsLoading,
      customerOptions,
      selectedCustomerId,
      selectCustomer,
      setCustomerSearch,
      customersLoading,
      customerLocked,
      notes,
      recentEntries,
      onStart,
      onPause,
      onResume,
      onCancel,
      onSubmit,
      onManualEntry,
      onEntryClick,
      onOpenMyTime,
      onOpenMyTimeMenu,
      isStarting,
      isPausing,
      isResuming,
      isSubmitting,
    ],
  );

  return (
    <TimeTrackerProvider {...trackerData}>
      <Suspense fallback={null}>
        <CurrentTimerHydrator onTimer={setTimerNode} />
      </Suspense>
      <Suspense fallback={null}>
        <RecentEntriesHydrator onEntries={setRecentNodes} />
      </Suspense>
      {children}
      <ManualEntryModal
        isOpen={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        onSuccess={onEntriesChanged}
      />
      <ManualEntryModal
        isOpen={!!editTarget}
        entry={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={onEntriesChanged}
      />
      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="Cancel Entry"
        description={<CancelEntryDescription runningSince={clock.runningSince} accumulatedMs={clock.accumulatedMs} />}
        variant="destructive"
        isPending={isCancelling}
        onConfirm={confirmCancel}
      />
    </TimeTrackerProvider>
  );
}

/**
 * The discarded time is shown live so it matches the still-ticking panel timer up to
 * the moment of confirmation. Static while paused (`runningSince` null).
 */
function CancelEntryDescription({
  runningSince,
  accumulatedMs,
}: {
  runningSince: number | null;
  accumulatedMs: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (runningSince == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runningSince]);

  const elapsedMs = accumulatedMs + (runningSince != null ? now - runningSince : 0);
  return (
    <>
      The timer will stop and{' '}
      <span className="font-mono tabular-nums text-ods-error">{formatDurationLabel(elapsedMs / 1000)}</span> won't be
      logged.
    </>
  );
}

function CurrentTimerHydrator({ onTimer }: { onTimer: (node: TimeEntryNodeShape | null) => void }) {
  const data = useLazyLoadQuery<CurrentTimerRelayQueryType>(
    currentTimerRelayQuery,
    {},
    { fetchPolicy: 'store-and-network' },
  );
  useEffect(() => {
    onTimer(data.currentTimer ?? null);
  }, [data.currentTimer, onTimer]);
  return null;
}

function RecentEntriesHydrator({ onEntries }: { onEntries: (nodes: TimeEntryNodeShape[]) => void }) {
  const queryData = useLazyLoadQuery<MyTimeEntriesRelayQueryType>(
    myTimeEntriesRelayQuery,
    { first: 3, after: null },
    { fetchPolicy: 'store-and-network' },
  );
  const { data } = usePaginationFragment<MyTimeEntriesPaginationQueryType, MyTimeEntriesFragmentKey>(
    myTimeEntriesRelayFragment,
    queryData,
  );
  const nodes = useMemo(
    // `node` can be null briefly after a delete removes the record but not the edge.
    () => data.myTimeEntries.edges.filter(edge => edge.node != null).map(edge => edge.node),
    [data.myTimeEntries.edges],
  );
  useEffect(() => {
    onEntries(nodes);
  }, [nodes, onEntries]);
  return null;
}
