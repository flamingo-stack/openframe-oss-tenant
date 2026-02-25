import { AppLayout } from '../../components/app-layout';
import { DialogDetailsView } from '../components/dialog-details-view';

// Force dynamic rendering due to useSearchParams in AppLayout
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

interface DialogDetailsPageProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function DialogDetailsPage({ searchParams }: DialogDetailsPageProps) {
  const params = await searchParams;
  const { id } = params;

  if (!id) {
    redirect('/tickets');
  }

  return (
    <AppLayout>
      <DialogDetailsView dialogId={id} />
    </AppLayout>
  );
}
