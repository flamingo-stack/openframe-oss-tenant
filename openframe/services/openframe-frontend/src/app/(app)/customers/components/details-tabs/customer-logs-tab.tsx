'use client';

import { LogsTable } from '@/app/(app)/logs-page/components/logs-table';

interface CustomerLogsTabProps {
  organizationId: string;
}

/**
 * Logs tab — fully delegates to the shared LogsTable, which renders its own
 * page layout (title + Refresh + search) and uses `organizationId` to lock the
 * SOURCE filter to this organization.
 */
export function CustomerLogsTab({ organizationId }: CustomerLogsTabProps) {
  return <LogsTable organizationId={organizationId} />;
}
