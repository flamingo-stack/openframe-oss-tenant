'use client';

import { type TimeTrackerData, TimeTrackerProvider } from '@flamingo-stack/openframe-frontend-core/components/features';
import type { ReactNode } from 'react';

const noop = () => {};

// Placeholder data for the purely-UI TimeTrackerProvider. There is no
// time-tracking backend yet, so the header button renders but every action is
// inert. Replace this with a real host hook (timer state, ticket search,
// onSubmit persistence) once the backend lands.
const STUB_TIME_TRACKER_DATA: TimeTrackerData = {
  status: 'ready',
  ticketOptions: [],
  selectedTicketIds: [],
  onSelectedTicketsChange: noop,
  notes: '',
  onNotesChange: noop,
  lastEntries: [],
  onStart: noop,
  onPause: noop,
  onResume: noop,
  onCancel: noop,
  onSubmit: noop,
};

export function TimeTrackerHostProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  if (!enabled) return <>{children}</>;
  return <TimeTrackerProvider {...STUB_TIME_TRACKER_DATA}>{children}</TimeTrackerProvider>;
}
