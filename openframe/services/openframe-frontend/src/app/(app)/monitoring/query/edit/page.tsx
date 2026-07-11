'use client';

import { useRequiredIdParam } from '@/app/hooks/use-required-id-param';
import { routes } from '@/lib/routes';
import { EditQueryPage } from '../components/edit-query-page';

export default function EditQueryPageWrapper() {
  const id = useRequiredIdParam(routes.monitoring.root({ tab: 'queries' }), routes.monitoring.queryNew);
  if (!id) return null;
  return <EditQueryPage queryId={id} />;
}
