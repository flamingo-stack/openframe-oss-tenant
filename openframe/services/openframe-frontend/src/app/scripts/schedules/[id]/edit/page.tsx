'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '../../../../components/app-layout';
import { ScheduleCreateView } from '../../../components/schedule-create-view';

export const dynamic = 'force-dynamic';

export default function EditSchedulePage() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  return (
    <AppLayout>
      <ScheduleCreateView scheduleId={id} />
    </AppLayout>
  );
}
