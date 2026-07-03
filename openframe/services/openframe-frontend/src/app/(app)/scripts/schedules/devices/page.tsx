'use client';

import { useSearchParams } from 'next/navigation';
import { ScheduleAssignDevicesView } from '../../components/schedule/schedule-assign-devices-view';

export default function ScheduleAssignDevicesPage() {
  const id = useSearchParams().get('id') ?? '';
  return <ScheduleAssignDevicesView scheduleId={id} />;
}
