'use client';

import { AppLayout } from '../components/app-layout';
import DashboardContent from './components/dashboard-content';

export default function Dashboard() {
  return (
    <AppLayout>
      <DashboardContent />
    </AppLayout>
  );
}

export const dynamic = 'force-dynamic';
