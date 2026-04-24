'use client';

import { useParams } from 'next/navigation';
import { ScheduleCreateView } from '../../../components/schedule/schedule-create-view';

export const dynamic = 'force-dynamic';

export default function EditSchedulePage() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  return <ScheduleCreateView scheduleId={id} />;
}
