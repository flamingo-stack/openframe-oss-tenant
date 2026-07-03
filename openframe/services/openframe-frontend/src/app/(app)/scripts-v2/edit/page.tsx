'use client';

import { useRequiredIdParam } from '@/app/hooks/use-required-id-param';
import { EditScriptPage } from '../../scripts/v2/components/edit-script-page';

export default function EditScriptV2PageWrapper() {
  const id = useRequiredIdParam('/scripts-v2', '/scripts-v2/new');
  if (!id) return null;
  return <EditScriptPage scriptId={id} />;
}
