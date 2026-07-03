'use client';

import { useRequiredIdParam } from '@/app/hooks/use-required-id-param';
import { EditPolicyPage } from '../components/edit-policy-page';

export default function EditPolicyPageWrapper() {
  const id = useRequiredIdParam('/monitoring?tab=policies', '/monitoring/policy/new');
  if (!id) return null;
  return <EditPolicyPage policyId={id} />;
}
