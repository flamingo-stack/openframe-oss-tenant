'use client';

import { useSearchParams } from 'next/navigation';
import { ScriptExecutionDetailsView } from '../../scripts/v2/components/script-execution-details-view';

export default function ScriptExecutionDetailsPage() {
  const id = useSearchParams().get('id') ?? '';
  return <ScriptExecutionDetailsView executionId={id} />;
}
