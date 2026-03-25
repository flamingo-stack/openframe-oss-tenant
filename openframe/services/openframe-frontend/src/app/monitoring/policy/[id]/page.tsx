'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout } from '../../../components/app-layout';
import { PolicyDetailsView } from '../components/policy-details-view';

export default function PolicyPageWrapper() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const paramId = params?.id;

  useEffect(() => {
    if (paramId === 'new') {
      router.replace('/monitoring/policy/edit/new');
    }
  }, [paramId, router]);

  if (paramId === 'new') {
    return null;
  }

  return (
    <AppLayout>
      <PolicyDetailsView policyId={paramId || ''} />
    </AppLayout>
  );
}
