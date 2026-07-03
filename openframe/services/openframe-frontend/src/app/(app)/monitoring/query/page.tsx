'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { QueryDetailsView } from './components/query-details-view';

export default function QueryPage() {
  const router = useRouter();
  const paramId = useSearchParams().get('id');

  useEffect(() => {
    if (paramId === 'new') {
      router.replace('/monitoring/query/edit?id=new');
    }
  }, [paramId, router]);

  if (paramId === 'new') {
    return null;
  }

  return <QueryDetailsView queryId={paramId || ''} />;
}
