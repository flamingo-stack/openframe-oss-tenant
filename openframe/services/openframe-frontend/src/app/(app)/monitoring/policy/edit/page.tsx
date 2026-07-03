'use client';

import { useSearchParams } from 'next/navigation';
import { EditPolicyPage } from '../components/edit-policy-page';

export default function EditPolicyPageWrapper() {
  const paramId = useSearchParams().get('id');
  const id = paramId === 'new' ? null : paramId;
  return <EditPolicyPage policyId={id} />;
}
