'use client';

import { useRequiredIdParam } from '@/app/hooks/use-required-id-param';
import { EditQueryPage } from '../components/edit-query-page';

export default function EditQueryPageWrapper() {
  const id = useRequiredIdParam('/monitoring?tab=queries', '/monitoring/query/new');
  if (!id) return null;
  return <EditQueryPage queryId={id} />;
}
