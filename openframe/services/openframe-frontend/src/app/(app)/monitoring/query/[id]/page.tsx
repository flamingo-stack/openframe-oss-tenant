'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { QueryDetailsView } from '../components/query-details-view';

export default function QueryPageWrapper() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const paramId = params?.id;

  useEffect(() => {
    if (paramId === 'new') {
      router.replace('/monitoring/query/edit/new');
    }
  }, [paramId, router]);

  if (paramId === 'new') {
    return null;
  }

  return <QueryDetailsView queryId={paramId || ''} />;
}
