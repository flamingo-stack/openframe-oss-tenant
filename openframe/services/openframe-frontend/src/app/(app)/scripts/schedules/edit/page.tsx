'use client';

import { useRequiredIdParam } from '@/app/hooks/use-required-id-param';
import { routes } from '@/lib/routes';
import { ScheduleCreateView } from '../../components/schedule/schedule-create-view';

export default function EditSchedulePage() {
  const id = useRequiredIdParam('/scripts/schedules', routes.scripts.schedules.new);
  if (!id) return null;
  return <ScheduleCreateView scheduleId={id} />;
}
