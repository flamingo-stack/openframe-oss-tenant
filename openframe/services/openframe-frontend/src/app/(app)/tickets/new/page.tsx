'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isSaasTenantMode } from '@/lib/app-mode';
import { CreateEditTicketPage } from '../components/create-edit';
import { useDialogVersion } from '../hooks/use-dialog-version';

export default function NewTicketPage() {
  const router = useRouter();
  const dialogVersion = useDialogVersion();

  useEffect(() => {
    if (!isSaasTenantMode() || dialogVersion !== 'v2') {
      router.replace('/tickets');
    }
  }, [router, dialogVersion]);

  if (!isSaasTenantMode() || dialogVersion !== 'v2') {
    return null;
  }

  return <CreateEditTicketPage />;
}
