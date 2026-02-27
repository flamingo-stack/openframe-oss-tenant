'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '../../../../components/app-layout';
import { EditQueryPage } from '../../components/edit-query-page';

export default function EditQueryPageWrapper() {
  const params = useParams<{ id?: string }>();
  const rawId = params?.id;
  const id = rawId === 'new' ? null : typeof rawId === 'string' ? rawId : null;
  return (
    <AppLayout>
      <EditQueryPage queryId={id} />
    </AppLayout>
  );
}
