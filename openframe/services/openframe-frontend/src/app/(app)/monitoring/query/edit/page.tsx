'use client';

import { useSearchParams } from 'next/navigation';
import { EditQueryPage } from '../components/edit-query-page';

export default function EditQueryPageWrapper() {
  const paramId = useSearchParams().get('id');
  const id = paramId === 'new' ? null : paramId;
  return <EditQueryPage queryId={id} />;
}
