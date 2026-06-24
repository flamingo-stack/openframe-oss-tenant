import type { TimeTrackerEntry, TimeTrackerStatus } from '@flamingo-stack/openframe-frontend-core/components/features';
import { addDays, format } from 'date-fns';
import { ConnectionHandler, type RecordSourceSelectorProxy } from 'relay-runtime';
import { TimerState } from '@/generated/schema-enums';
import { formatDate } from '@/lib/format-date';
import { ensureGlobalIdForType } from '@/lib/relay-id';

export const MY_TIME_ENTRIES_CONNECTION_KEY = 'MyTimeEntries_myTimeEntries';
const TIME_ENTRY_EDGE_TYPENAME = 'TimeEntryEdge';
const CURRENT_TIMER_FIELD = 'currentTimer';

export interface TimeEntryNodeShape {
  readonly id: string;
  readonly state: string;
  readonly durationSeconds: unknown;
  readonly breakSeconds?: unknown;
  readonly startedAt: unknown;
  readonly pausedAt?: unknown;
  readonly updatedAt?: unknown;
  readonly ticketId?: string | null;
  readonly ticketNumber?: number | null;
  readonly ticketTitle?: string | null;
  readonly notes?: string | null;
}

export interface TrackerClockState {
  status: TimeTrackerStatus;
  runningSince: number | null;
  accumulatedMs: number;
}

const EPOCH_MS_THRESHOLD = 1e12;

/** Instant scalar may arrive as ISO string, epoch seconds, or epoch ms — normalize to ms. */
export function parseInstant(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < EPOCH_MS_THRESHOLD ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber < EPOCH_MS_THRESHOLD ? asNumber * 1000 : asNumber;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

/**
 * Maps the backend timer to the core lib's display contract. ALL timer math lives here.
 *
 * The backend keeps `durationSeconds` at 0 for the whole active session (it's only
 * computed at stop as `(now - startedAt) - breakSeconds`), so worked time must be derived
 * from `startedAt`, the accumulated completed breaks (`breakSeconds`, which excludes the
 * current open pause), and — while paused — `pausedAt`. Worked = (now - startedAt) - breakSeconds.
 */
export function mapTimerToTrackerState(node: TimeEntryNodeShape | null): TrackerClockState {
  if (!node || node.state === TimerState.COMPLETED) {
    return { status: 'ready', runningSince: null, accumulatedMs: 0 };
  }
  const startedMs = parseInstant(node.startedAt);
  const breakMs = Number(node.breakSeconds ?? 0) * 1000;
  if (node.state === TimerState.PAUSED) {
    const workedMs = parseInstant(node.pausedAt) - startedMs - breakMs;
    return { status: 'paused', runningSince: null, accumulatedMs: Math.max(0, workedMs) };
  }
  // RUNNING: useTrackerClock shows accumulatedMs + (now - runningSince); shifting the
  // start forward by completed breaks makes the live tick equal (now - startedAt) - breakSeconds.
  return { status: 'tracking', runningSince: startedMs + breakMs, accumulatedMs: 0 };
}

export function formatDurationLabel(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

export interface DateRangeInputValue {
  startDate: string;
  endDate: string;
}

/**
 * Build the GraphQL `DateRangeInput` from an inclusive [from, to] day range.
 * The backend range is half-open [startDate, endDate) on the `Date` scalar
 * (YYYY-MM-DD), so `endDate` is the day after `to` to keep `to` itself included.
 */
export function toDateRangeInput(from: Date, to: Date): DateRangeInputValue {
  return { startDate: format(from, 'yyyy-MM-dd'), endDate: format(addDays(to, 1), 'yyyy-MM-dd') };
}

/**
 * Normalize a ticket id to a Relay `Ticket` global id for time-tracker mutations.
 * The ticket search comes from ai-agent (/chat/graphql), which returns raw Mongo
 * ObjectIds, but saas-api decodes ticketId as a global id. Idempotent; null-safe.
 */
export function toTicketGlobalId(ticketId: string | null | undefined): string | null {
  return ticketId ? ensureGlobalIdForType('Ticket', ticketId) : null;
}

/** Parse an `HH:MM:SS` label to seconds; null when malformed (used by the manual-entry form). */
export function parseDurationLabel(label: string): number | null {
  const parts = label.trim().split(':');
  if (parts.length !== 3 || parts.some(part => !/^\d+$/.test(part.trim()))) return null;
  const [hours, minutes, secs] = parts.map(Number);
  if (![hours, minutes, secs].every(n => Number.isInteger(n) && n >= 0)) return null;
  if (minutes > 59 || secs > 59) return null;
  return hours * 3600 + minutes * 60 + secs;
}

export function mapTimeEntryToLastEntry(node: TimeEntryNodeShape): TimeTrackerEntry {
  return {
    id: node.id,
    durationLabel: formatDurationLabel(Number(node.durationSeconds)),
    dateLabel: formatDate(parseInstant(node.startedAt)),
    title: node.ticketTitle ?? (node.ticketNumber != null ? `#${node.ticketNumber}` : 'Manual entry'),
    description: node.notes ?? undefined,
  };
}

/** Point the `currentTimer` root field at the node returned by start/pause/resume. */
export function makeSetCurrentTimerUpdater(fieldName: 'startTimer' | 'pauseTimer' | 'resumeTimer') {
  return (store: RecordSourceSelectorProxy) => {
    const node = store.getRootField(fieldName);
    if (node) store.getRoot().setLinkedRecord(node, CURRENT_TIMER_FIELD);
  };
}

/** Prepend a completed entry returned by `fieldName` into the recent-entries connection. */
function prependCompletedEntry(store: RecordSourceSelectorProxy, fieldName: string): void {
  const node = store.getRootField(fieldName);
  if (!node) return;
  const conn = ConnectionHandler.getConnection(store.getRoot(), MY_TIME_ENTRIES_CONNECTION_KEY);
  if (!conn) return;
  const id = node.getDataID();
  const edges = conn.getLinkedRecords('edges') ?? [];
  if (edges.some(edge => edge?.getLinkedRecord('node')?.getDataID() === id)) return;
  const edge = ConnectionHandler.createEdge(store, conn, node, TIME_ENTRY_EDGE_TYPENAME);
  ConnectionHandler.insertEdgeBefore(conn, edge);
}

/**
 * stopTimer returns the entry now in COMPLETED state; normalizing it by id flips the live
 * timer to "ready" (see mapTimerToTrackerState), and we prepend it to the recent list.
 * We deliberately do NOT null `currentTimer` — RelayRecordProxy#setLinkedRecord rejects
 * null at runtime, and the COMPLETED state already stops the clock.
 */
export function makeStopTimerUpdater() {
  return (store: RecordSourceSelectorProxy) => {
    prependCompletedEntry(store, 'stopTimer');
  };
}

/** createTimeEntry adds a manual entry straight to the recent list (no active timer involved). */
export function makeCreateTimeEntryUpdater() {
  return (store: RecordSourceSelectorProxy) => {
    prependCompletedEntry(store, 'createTimeEntry');
  };
}

/** Delete the entry record outright so it drops from every connection it appears in. */
export function makeDeleteTimeEntryUpdater(id: string) {
  return (store: RecordSourceSelectorProxy) => {
    store.delete(id);
  };
}

/** cancelTimer discards the entry server-side; delete the record so `currentTimer` reads null. */
export function makeCancelTimerUpdater(timerId: string) {
  return (store: RecordSourceSelectorProxy) => {
    store.delete(timerId);
  };
}

/**
 * Cross-surface invalidation for time entries. Store updaters keep each surface's
 * connections consistent, but `employeeTimeStats` is a server aggregate that only
 * the employee work-time query can recompute — so when the global timer widget
 * changes an entry, a mounted "My Time" page for that user must refetch.
 * `userId` is the raw (non-global) id of the affected user so subscribers can
 * ignore changes for someone else.
 */
type TimeEntriesChangedListener = (userId: string | null) => void;
const timeEntriesChangedListeners = new Set<TimeEntriesChangedListener>();

export function notifyTimeEntriesChanged(userId: string | null): void {
  for (const listener of timeEntriesChangedListeners) listener(userId);
}

export function subscribeTimeEntriesChanged(listener: TimeEntriesChangedListener): () => void {
  timeEntriesChangedListeners.add(listener);
  return () => {
    timeEntriesChangedListeners.delete(listener);
  };
}
