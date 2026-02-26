'use client';

import { AppLayout } from '../../../components/app-layout';
import { ScheduleCreateView } from '../../components/schedule/schedule-create-view';

export const dynamic = 'force-dynamic';

export default function CreateSchedulePage() {
  return (
    <AppLayout>
      <ScheduleCreateView />
    </AppLayout>
  );
}
