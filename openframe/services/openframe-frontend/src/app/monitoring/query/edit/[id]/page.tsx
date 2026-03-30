'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '../../../../components/app-layout';
import { EditQueryPage } from '../../components/edit-query-page';

export default function EditQueryPageWrapper() {
  const params = useParams<{ id?: string }>();
  const paramId = params?.id;
  const id = paramId === 'new' ? null : typeof paramId === 'string' ? paramId : null;
  return (
    <AppLayout>
      <EditQueryPage queryId={id} />
    </AppLayout>
  );
}
