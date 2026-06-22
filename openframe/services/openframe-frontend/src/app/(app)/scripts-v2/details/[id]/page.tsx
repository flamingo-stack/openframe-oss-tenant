'use client';

import { useParams } from 'next/navigation';
import { ScriptDetailsView } from '../../../scripts/v2/components/script-details-view';

export default function ScriptDetailsV2Page() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  return <ScriptDetailsView scriptId={id} />;
}
