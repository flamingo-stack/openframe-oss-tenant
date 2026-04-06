'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../components/app-layout';
import { LogsTableRelay } from './components/logs-table-relay';

export default function Logs() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <LogsTableRelay />
      </div>
    </AppLayout>
  );
}
