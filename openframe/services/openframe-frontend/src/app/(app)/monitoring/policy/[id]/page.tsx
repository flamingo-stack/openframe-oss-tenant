'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { routes } from '@/lib/routes';
import { PolicyDetailsView } from '../components/policy-details-view';

export default function PolicyPageWrapper() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const paramId = params?.id;

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
