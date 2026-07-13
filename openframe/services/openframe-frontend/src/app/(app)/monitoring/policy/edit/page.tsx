'use client';

import { useRequiredIdParam } from '@/app/hooks/use-required-id-param';
import { routes } from '@/lib/routes';
import { EditPolicyPage } from '../components/edit-policy-page';

export default function EditPolicyPageWrapper() {
  const id = useRequiredIdParam(routes.monitoring.root({ tab: 'policies' }), routes.monitoring.policyNew);
  if (!id) return null;
  return <EditPolicyPage policyId={id} />;
}
