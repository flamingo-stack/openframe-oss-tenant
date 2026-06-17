'use client';

export const dynamic = 'force-dynamic';

import { LogsTable } from './components/logs-table';

export default function Logs() {
  return (
    <div className="px-4 pb-4 md:px-6 md:pb-6">
      <LogsTable />
    </div>
  );
}
