'use client';

import { LogsTable } from '@/app/(app)/logs-page/components/logs-table';

interface OrganizationLogsTabProps {
  organizationId: string;
}

/**
 * Logs tab — fully delegates to the shared LogsTable, which renders its own
 * page layout (title + Refresh + search) and uses `organizationId` to lock the
 * SOURCE filter to this organization.
 */
export function OrganizationLogsTab({ organizationId }: OrganizationLogsTabProps) {
  return <LogsTable organizationId={organizationId} />;
}
