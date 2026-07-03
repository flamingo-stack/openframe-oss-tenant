'use client';

import { useSearchParams } from 'next/navigation';
import RunScriptView from '../../components/script/run-script-view';

export default function RunScriptPage() {
  const id = useSearchParams().get('id') ?? '';
  return <RunScriptView scriptId={id} />;
}
