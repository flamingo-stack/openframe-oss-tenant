'use client';

import { useParams } from 'next/navigation';
import { EditQueryPage } from '../../components/edit-query-page';

export default function EditQueryPageWrapper() {
  const params = useParams<{ id?: string }>();
  const paramId = params?.id;
  const id = paramId === 'new' ? null : typeof paramId === 'string' ? paramId : null;
  return <EditQueryPage queryId={id} />;
}
