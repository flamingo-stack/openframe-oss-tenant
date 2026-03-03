'use client';

import { AppLayout } from '../../components/app-layout';
import { EditScriptPage } from '../components/script/edit-script-page';

export default function CreateScriptPageWrapper() {
  return (
    <AppLayout>
      <EditScriptPage scriptId={null} />
    </AppLayout>
  );
}
