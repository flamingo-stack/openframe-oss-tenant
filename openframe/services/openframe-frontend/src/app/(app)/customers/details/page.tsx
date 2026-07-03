'use client';

import { useSearchParams } from 'next/navigation';
import { CustomerDetailsView } from '../components/customer-details-view';

export default function CustomerDetailsPage() {
  const id = useSearchParams().get('id') ?? '';
  return <CustomerDetailsView id={id} />;
}
