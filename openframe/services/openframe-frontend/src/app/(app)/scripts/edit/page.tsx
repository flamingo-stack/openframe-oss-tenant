'use client';

import { useRequiredIdParam } from '@/app/hooks/use-required-id-param';
import { routes } from '@/lib/routes';
import { EditScriptPage } from '../components/script/edit-script-page';

export default function EditScriptPageWrapper() {
  const id = useRequiredIdParam('/scripts', routes.scripts.new);
  if (!id) return null;
  return <EditScriptPage scriptId={id} />;
}
