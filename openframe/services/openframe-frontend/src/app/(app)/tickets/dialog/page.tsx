import { TicketDetailsView } from '../components/ticket-details-view';

// Force dynamic rendering due to useSearchParams in AppLayout
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

interface TicketDetailsPageProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function TicketDetailsPage({ searchParams }: TicketDetailsPageProps) {
  const params = await searchParams;
  const { id } = params;

  if (!id) {
    redirect(routes.tickets.list);
  }

  return <TicketDetailsView ticketId={id} />;
}
