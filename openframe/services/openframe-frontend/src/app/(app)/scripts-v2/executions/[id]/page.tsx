'use client';

import { useParams } from 'next/navigation';
import { ScriptExecutionDetailsView } from '../../../scripts/v2/components/script-execution-details-view';

export default function ScriptExecutionDetailsPage() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  return <ScriptExecutionDetailsView executionId={id} />;
}
