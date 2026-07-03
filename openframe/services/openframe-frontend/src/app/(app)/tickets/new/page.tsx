'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isSaasTenantMode } from '@/lib/app-mode';
import { routes } from '@/lib/routes';
import { CreateEditTicketPage } from '../components/create-edit';

export default function NewTicketPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace(routes.tickets.list);
    }
  }, [router]);

  if (!isSaasTenantMode()) {
    return null;
  }

  return <CreateEditTicketPage />;
}
