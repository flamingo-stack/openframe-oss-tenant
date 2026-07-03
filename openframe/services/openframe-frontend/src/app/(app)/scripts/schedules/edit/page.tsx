'use client';

import { useSearchParams } from 'next/navigation';
import { ScheduleCreateView } from '../../components/schedule/schedule-create-view';

export default function EditSchedulePage() {
  const id = useSearchParams().get('id') ?? '';
  return <ScheduleCreateView scheduleId={id} />;
}
