'use client';

import { useParams } from 'next/navigation';
import RunScriptView from '../../../../scripts/v2/components/run-script-view';

export default function RunScriptV2Page() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  return <RunScriptView scriptId={id} />;
}
