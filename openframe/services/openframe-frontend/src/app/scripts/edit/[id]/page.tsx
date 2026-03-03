'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '../../../components/app-layout';
import { EditScriptPage } from '../../components/script/edit-script-page';

export default function EditScriptPageWrapper() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : null;
  return (
    <AppLayout>
      <EditScriptPage scriptId={id} />
    </AppLayout>
  );
}
