'use client';

import { useParams } from 'next/navigation';
import { ScriptDetailsView } from '../../components/script/script-details-view';

export default function ScriptDetailsPage() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  return <ScriptDetailsView scriptId={id} />;
}
