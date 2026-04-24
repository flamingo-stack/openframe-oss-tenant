'use client';

export const dynamic = 'force-dynamic';

import { LogsTable } from './components/logs-table';

export default function Logs() {
  return (
    <div className="space-y-6">
      <LogsTable />
    </div>
  );
}
