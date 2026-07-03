'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { PolicyDetailsView } from './components/policy-details-view';

export default function PolicyPage() {
  const router = useRouter();
  const paramId = useSearchParams().get('id');

  useEffect(() => {
    if (paramId === 'new') {
      router.replace('/monitoring/policy/edit?id=new');
    }
  }, [paramId, router]);

  if (paramId === 'new') {
    return null;
  }

  return <PolicyDetailsView policyId={paramId || ''} />;
}
