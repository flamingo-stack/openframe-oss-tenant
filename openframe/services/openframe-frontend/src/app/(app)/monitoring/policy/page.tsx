'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { routes } from '@/lib/routes';
import { PolicyDetailsView } from './components/policy-details-view';

export default function PolicyPage() {
  const router = useRouter();
  const paramId = useSearchParams().get('id');

  useEffect(() => {
    if (paramId === 'new') {
      router.replace(routes.monitoring.policyEditNew);
    }
  }, [paramId, router]);

  if (paramId === 'new') {
    return null;
  }

  return <PolicyDetailsView policyId={paramId || ''} />;
}
