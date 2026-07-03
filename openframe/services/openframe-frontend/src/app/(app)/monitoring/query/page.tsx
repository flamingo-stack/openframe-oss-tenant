'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { QueryDetailsView } from './components/query-details-view';

export default function QueryPage() {
  const router = useRouter();
  const paramId = useSearchParams().get('id');

  // Pre-alignment links created queries via `?id=new` on this details route;
  // kept as a redirect so old bookmarks land on the create form.
  useEffect(() => {
    if (paramId === 'new') {
      router.replace('/monitoring/query/new');
    }
  }, [paramId, router]);

  if (paramId === 'new') {
    return null;
  }

  return <QueryDetailsView queryId={paramId || ''} />;
}
