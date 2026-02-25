import { AppLayout } from '../components/app-layout';
import { LogDetailsView } from './components/log-details-view';

// Force dynamic rendering due to useSearchParams in AppLayout
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

interface LogDetailsPageProps {
  searchParams: Promise<{
    id?: string;
    ingestDay?: string;
    toolType?: string;
    eventType?: string;
    timestamp?: string;
  }>;
}

export default async function LogDetailsPage({ searchParams }: LogDetailsPageProps) {
  const params = await searchParams;
  const { id, ingestDay, toolType, eventType, timestamp } = params;

  if (!id || !ingestDay || !toolType || !eventType || !timestamp) {
    redirect('/logs-page');
  }

  return (
    <AppLayout>
      <LogDetailsView
        logId={id}
        ingestDay={ingestDay}
        toolType={toolType}
        eventType={eventType}
        timestamp={timestamp}
      />
    </AppLayout>
  );
}
