'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '../../../components/app-layout';
import { OrganizationDetailsView } from '../../components/organization-details-view';

export default function OrganizationDetailsPageWrapper() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  return (
    <AppLayout>
      <OrganizationDetailsView id={id} />
    </AppLayout>
  );
}
