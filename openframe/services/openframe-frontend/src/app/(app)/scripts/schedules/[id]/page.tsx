'use client';

import { useParams } from 'next/navigation';
import { ScheduleDetailView } from '../../components/schedule/schedule-details-view';

export const dynamic = 'force-dynamic';

export default function ScheduleDetailPage() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  return <ScheduleDetailView scheduleId={id} />;
}
