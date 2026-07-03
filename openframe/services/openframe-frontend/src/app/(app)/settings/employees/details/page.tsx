'use client';

import { useSearchParams } from 'next/navigation';
import { EmployeeDetailsView } from '@/app/(app)/settings/components/employee-details-view';

export default function EmployeeDetailsPage() {
  const userId = useSearchParams().get('id') ?? '';
  return <EmployeeDetailsView userId={userId} />;
}
