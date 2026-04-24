'use client';

import { useParams } from 'next/navigation';
import { NewOrganizationPage } from '@/app/(app)/organizations/components/new-organization-page';
export default function EditOrganizationPageWrapper() {
  const params = useParams<{ id?: string }>();
  const paramId = params?.id;
  const id = paramId === 'new' ? null : typeof paramId === 'string' ? paramId : null;
  return <NewOrganizationPage organizationId={typeof id === 'string' ? id : null} />;
}
