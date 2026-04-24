'use client';

import { useParams } from 'next/navigation';
import { ScheduleAssignDevicesView } from '../../../components/schedule/schedule-assign-devices-view';

export const dynamic = 'force-dynamic';

export default function ScheduleAssignDevicesPage() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  return <ScheduleAssignDevicesView scheduleId={id} />;
}
