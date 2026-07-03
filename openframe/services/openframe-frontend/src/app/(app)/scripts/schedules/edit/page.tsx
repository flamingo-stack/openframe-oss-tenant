'use client';

import { useRequiredIdParam } from '@/app/hooks/use-required-id-param';
import { ScheduleCreateView } from '../../components/schedule/schedule-create-view';

export default function EditSchedulePage() {
  const id = useRequiredIdParam('/scripts/schedules');
  if (!id) return null;
  return <ScheduleCreateView scheduleId={id} />;
}
