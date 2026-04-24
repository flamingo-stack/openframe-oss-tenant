'use client';

import { useParams } from 'next/navigation';
import { EditScriptPage } from '../../components/script/edit-script-page';

export default function EditScriptPageWrapper() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : null;
  return <EditScriptPage scriptId={id} />;
}
