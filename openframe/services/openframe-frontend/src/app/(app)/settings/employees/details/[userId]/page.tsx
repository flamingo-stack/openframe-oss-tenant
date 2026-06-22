'use client';

export const dynamic = 'force-dynamic';

import { useParams } from 'next/navigation';
import { EmployeeDetailsView } from '@/app/(app)/settings/components/employee-details-view';

export default function EmployeeDetailsPage() {
  const params = useParams<{ userId?: string }>();
  const userId = typeof params?.userId === 'string' ? params.userId : '';
  return <EmployeeDetailsView userId={userId} />;
}
