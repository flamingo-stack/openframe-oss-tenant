'use client';

export const dynamic = 'force-dynamic';

import { LogsTable } from './components/logs-table';

export default function Logs() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <LogsTable />
    </div>
  );
}
