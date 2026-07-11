'use client';

import { NewCustomerPage } from '@/app/(app)/customers/components/new-customer-page';
import { useRequiredIdParam } from '@/app/hooks/use-required-id-param';
import { routes } from '@/lib/routes';

export default function EditOrganizationPage() {
  const id = useRequiredIdParam('/customers', routes.customers.new);
  if (!id) return null;
  return <NewCustomerPage organizationId={id} />;
}
