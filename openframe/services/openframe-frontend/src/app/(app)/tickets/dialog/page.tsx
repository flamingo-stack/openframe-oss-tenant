'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { routes } from '@/lib/routes';
import { TicketDetailsView } from '../components/ticket-details-view';

export default function TicketDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id') ?? undefined;

  useEffect(() => {
    if (!id) router.replace(routes.tickets.list);
  }, [id, router]);

  if (!id) return null;

  return <TicketDetailsView ticketId={id} />;
}
