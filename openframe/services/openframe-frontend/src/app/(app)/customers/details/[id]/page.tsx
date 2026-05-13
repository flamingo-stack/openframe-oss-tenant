'use client';

import { useParams } from 'next/navigation';
import { CustomerDetailsView } from '../../components/customer-details-view';

export default function CustomerDetailsPageWrapper() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  return <CustomerDetailsView id={id} />;
}
