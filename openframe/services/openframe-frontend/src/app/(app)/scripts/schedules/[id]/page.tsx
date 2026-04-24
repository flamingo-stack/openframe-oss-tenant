'use client';

import { useParams, useRouter } from 'next/navigation';
import { ScheduleDetailView } from '../../components/schedule/schedule-details-view';

export const dynamic = 'force-dynamic';

export default function ScheduleDetailPage() {
  const params = useParams<{ id?: string }>();
  const _router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  return <ScheduleDetailView scheduleId={id} />;
}
