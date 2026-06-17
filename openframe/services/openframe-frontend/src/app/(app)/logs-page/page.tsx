'use client';

export const dynamic = 'force-dynamic';

import { LogsTable } from './components/logs-table';

export default function Logs() {
  return (
    <div className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]">
      <LogsTable />
    </div>
  );
}
