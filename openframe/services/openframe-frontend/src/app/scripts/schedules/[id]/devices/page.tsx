'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '../../../../components/app-layout';
import { ScheduleAssignDevicesView } from '../../../components/schedule-assign-devices-view';

export const dynamic = 'force-dynamic';

export default function ScheduleAssignDevicesPage() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  return (
    <AppLayout>
      <ScheduleAssignDevicesView scheduleId={id} />
    </AppLayout>
  );
}
