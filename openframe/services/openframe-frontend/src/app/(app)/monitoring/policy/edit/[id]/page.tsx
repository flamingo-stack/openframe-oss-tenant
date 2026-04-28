'use client';

import { useParams } from 'next/navigation';
import { EditPolicyPage } from '../../components/edit-policy-page';

export default function EditPolicyPageWrapper() {
  const params = useParams<{ id?: string }>();
  const paramId = params?.id;
  const id = paramId === 'new' ? null : typeof paramId === 'string' ? paramId : null;
  return <EditPolicyPage policyId={id} />;
}
