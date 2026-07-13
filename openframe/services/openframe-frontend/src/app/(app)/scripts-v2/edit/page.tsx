'use client';

import { useRequiredIdParam } from '@/app/hooks/use-required-id-param';
import { routes } from '@/lib/routes';
import { EditScriptPage } from '../../scripts/v2/components/edit-script-page';

export default function EditScriptV2PageWrapper() {
  const id = useRequiredIdParam('/scripts-v2', routes.scriptsV2.new);
  if (!id) return null;
  return <EditScriptPage scriptId={id} />;
}
