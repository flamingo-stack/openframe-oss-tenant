'use client';

import { useSearchParams } from 'next/navigation';
import { EditScriptPage } from '../components/script/edit-script-page';

export default function EditScriptPageWrapper() {
  const id = useSearchParams().get('id');
  return <EditScriptPage scriptId={id} />;
}
