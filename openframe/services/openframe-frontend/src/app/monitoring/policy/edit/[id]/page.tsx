'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '../../../../components/app-layout';
import { EditPolicyPage } from '../../components/edit-policy-page';

export default function EditPolicyPageWrapper() {
  const params = useParams<{ id?: string }>();
  const paramId = params?.id;
  const id = paramId === 'new' ? null : typeof paramId === 'string' ? paramId : null;
  return (
    <AppLayout>
      <EditPolicyPage policyId={id} />
    </AppLayout>
  );
}
