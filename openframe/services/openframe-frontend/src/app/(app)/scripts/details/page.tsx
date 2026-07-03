'use client';

import { useSearchParams } from 'next/navigation';
import { ScriptDetailsView } from '../components/script/script-details-view';

export default function ScriptDetailsPage() {
  const id = useSearchParams().get('id') ?? '';
  return <ScriptDetailsView scriptId={id} />;
}
