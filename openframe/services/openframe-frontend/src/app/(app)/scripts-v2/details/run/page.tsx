'use client';

import { useSearchParams } from 'next/navigation';
import RunScriptView from '../../../scripts/v2/components/run-script-view';

export default function RunScriptV2Page() {
  const id = useSearchParams().get('id') ?? '';
  return <RunScriptView scriptId={id} />;
}
