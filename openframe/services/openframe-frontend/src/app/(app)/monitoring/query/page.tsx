'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { routes } from '@/lib/routes';
import { QueryDetailsView } from './components/query-details-view';

export default function QueryPage() {
  const router = useRouter();
  const paramId = useSearchParams().get('id');

  useEffect(() => {
    if (paramId === 'new') {
      router.replace(routes.monitoring.queryEditNew);
    }
  }, [paramId, router]);

  if (paramId === 'new') {
    return null;
  }

  return <QueryDetailsView queryId={paramId || ''} />;
}
