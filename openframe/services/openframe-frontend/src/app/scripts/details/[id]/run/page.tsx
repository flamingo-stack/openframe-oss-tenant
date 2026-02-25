'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '../../../../components/app-layout';
import RunScriptView from '../../../components/script/run-script-view';

export default function RunScriptPage() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  return (
    <AppLayout>
      <RunScriptView scriptId={id} />
    </AppLayout>
  );
}
