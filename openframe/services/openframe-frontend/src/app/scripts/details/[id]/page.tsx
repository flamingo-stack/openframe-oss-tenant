'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '../../../components/app-layout';
import { ScriptDetailsView } from '../../components/script-details-view';

export default function ScriptDetailsPage() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  return (
    <AppLayout>
      <ScriptDetailsView scriptId={id} />
    </AppLayout>
  );
}
