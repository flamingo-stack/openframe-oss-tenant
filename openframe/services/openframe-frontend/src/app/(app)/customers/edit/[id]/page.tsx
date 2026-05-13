'use client';

import { useParams } from 'next/navigation';
import { NewCustomerPage } from '@/app/(app)/customers/components/new-customer-page';
export default function EditOrganizationPageWrapper() {
  const params = useParams<{ id?: string }>();
  const paramId = params?.id;
  const id = paramId === 'new' ? null : typeof paramId === 'string' ? paramId : null;
  return <NewCustomerPage organizationId={typeof id === 'string' ? id : null} />;
}
