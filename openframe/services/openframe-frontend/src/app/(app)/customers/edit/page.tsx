'use client';

import { useSearchParams } from 'next/navigation';
import { NewCustomerPage } from '@/app/(app)/customers/components/new-customer-page';

export default function EditOrganizationPage() {
  const paramId = useSearchParams().get('id');
  const id = paramId === 'new' ? null : paramId;
  return <NewCustomerPage organizationId={id} />;
}
