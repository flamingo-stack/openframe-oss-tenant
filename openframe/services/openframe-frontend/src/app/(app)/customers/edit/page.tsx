'use client';

import { NewCustomerPage } from '@/app/(app)/customers/components/new-customer-page';
import { useRequiredIdParam } from '@/app/hooks/use-required-id-param';

export default function EditOrganizationPage() {
  const id = useRequiredIdParam('/customers', '/customers/new');
  if (!id) return null;
  return <NewCustomerPage organizationId={id} />;
}
