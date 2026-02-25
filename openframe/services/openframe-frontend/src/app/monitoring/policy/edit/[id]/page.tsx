'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '../../../../components/app-layout';
import { EditPolicyPage } from '../../components/edit-policy-page';

export default function EditPolicyPageWrapper() {
  const params = useParams<{ id?: string }>();
  const rawId = params?.id;
  const id = rawId === 'new' ? null : typeof rawId === 'string' ? rawId : null;
  return (
    <AppLayout>
      <EditPolicyPage policyId={id} />
    </AppLayout>
  );
}
