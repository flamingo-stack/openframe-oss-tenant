'use client';

import { useParams } from 'next/navigation';
import { EditScriptPage } from '../../../scripts/v2/components/edit-script-page';

export default function EditScriptV2PageWrapper() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : null;
  return <EditScriptPage scriptId={id} />;
}
