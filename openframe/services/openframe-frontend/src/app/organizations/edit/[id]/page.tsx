'use client';

import { useParams } from 'next/navigation';
import { NewOrganizationPage } from '@/app/organizations/components/new-organization-page';
import { AppLayout } from '../../../components/app-layout';

export default function EditOrganizationPageWrapper() {
  const params = useParams<{ id?: string }>();
  const paramId = params?.id;
  const id = paramId === 'new' ? null : typeof paramId === 'string' ? paramId : null;
  return (
    <AppLayout>
      <NewOrganizationPage organizationId={typeof id === 'string' ? id : null} />
    </AppLayout>
  );
}
