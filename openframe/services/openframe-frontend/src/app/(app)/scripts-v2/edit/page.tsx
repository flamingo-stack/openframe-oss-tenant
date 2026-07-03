'use client';

import { useSearchParams } from 'next/navigation';
import { EditScriptPage } from '../../scripts/v2/components/edit-script-page';

export default function EditScriptV2PageWrapper() {
  const id = useSearchParams().get('id');
  return <EditScriptPage scriptId={id} />;
}
