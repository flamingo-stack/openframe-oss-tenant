'use client';

import nextDynamic from 'next/dynamic';
import { AppLayout } from '../components/app-layout';
import DashboardLoading from './loading';

const DashboardContent = nextDynamic(() => import('./components/dashboard-content'), {
  ssr: false,
  loading: () => <DashboardLoading />,
});

export default function Dashboard() {
  return (
    <AppLayout>
      <DashboardContent />
    </AppLayout>
  );
}

export const dynamic = 'force-dynamic';
