'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout } from '../../../components/app-layout';
import { QueryDetailsView } from '../components/query-details-view';

export default function QueryPageWrapper() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const rawId = params?.id;

  useEffect(() => {
    if (rawId === 'new') {
      router.replace('/monitoring/query/edit/new');
    }
  }, [rawId, router]);

  if (rawId === 'new') {
    return null;
  }

  return (
    <AppLayout>
      <QueryDetailsView queryId={rawId || ''} />
    </AppLayout>
  );
}
