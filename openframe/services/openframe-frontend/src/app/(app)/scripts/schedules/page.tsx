'use client';

import { useSearchParams } from 'next/navigation';
import { ScheduleDetailView } from '../components/schedule/schedule-details-view';

export default function ScheduleDetailPage() {
  const id = useSearchParams().get('id') ?? '';
  return <ScheduleDetailView scheduleId={id} />;
}
