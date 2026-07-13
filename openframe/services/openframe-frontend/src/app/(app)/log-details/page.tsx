'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { routes } from '@/lib/routes';
import { LogDetailsView } from './components/log-details-view';

export default function LogDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = searchParams.get('id') ?? undefined;
  const ingestDay = searchParams.get('ingestDay') ?? undefined;
  const toolType = searchParams.get('toolType') ?? undefined;
  const eventType = searchParams.get('eventType') ?? undefined;
  const timestamp = searchParams.get('timestamp') ?? undefined;

  const missing = !id || !ingestDay || !toolType || !eventType || !timestamp;

  useEffect(() => {
    if (missing) router.replace(routes.logs.page);
  }, [missing, router]);

  if (missing) return null;

  return (
    <LogDetailsView logId={id} ingestDay={ingestDay} toolType={toolType} eventType={eventType} timestamp={timestamp} />
  );
}
