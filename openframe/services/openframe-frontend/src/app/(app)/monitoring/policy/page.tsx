'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { routes } from '@/lib/routes';
import { PolicyDetailsView } from './components/policy-details-view';

export default function PolicyPage() {
  const router = useRouter();
  const paramId = useSearchParams().get('id');

  // Pre-alignment links created policies via `?id=new` on this details route;
  // kept as a redirect so old bookmarks land on the create form.
  useEffect(() => {
    if (paramId === 'new') {
      router.replace(routes.monitoring.policyNew);
    }
  }, [paramId, router]);

  if (paramId === 'new') {
    return null;
  }

  return <PolicyDetailsView policyId={paramId || ''} />;
}
