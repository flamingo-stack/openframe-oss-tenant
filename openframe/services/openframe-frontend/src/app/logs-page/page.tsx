'use client';

export const dynamic = 'force-dynamic';

import {
  ListPageLayout,
  TableCardSkeleton,
  type TableColumn,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Suspense } from 'react';
import { AppLayout } from '../components/app-layout';
import { LogsTableRelay } from './components/logs-table-relay';

const SKELETON_COLUMNS: TableColumn[] = [
  { key: 'logId', label: 'Log ID', width: 'w-[200px]' },
  { key: 'status', label: 'Status', width: 'w-[120px]' },
  { key: 'tool', label: 'Tool', width: 'w-[150px]', hideAt: 'md' },
  { key: 'source', label: 'SOURCE', width: 'w-[120px]', hideAt: 'md' },
  { key: 'description', label: 'Log Details', width: 'flex-1', hideAt: 'lg' },
];

const noop = () => {};

function LogsTableSkeleton() {
  return (
    <ListPageLayout
      title="Logs"
      searchPlaceholder="Search for Logs"
      searchValue=""
      onSearch={noop}
      background="default"
      padding="none"
      stickyHeader
    >
      <TableCardSkeleton columns={SKELETON_COLUMNS} rows={10} hasActions rowClassName="mb-1" />
    </ListPageLayout>
  );
}

export default function Logs() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <Suspense fallback={<LogsTableSkeleton />}>
          <LogsTableRelay />
        </Suspense>
      </div>
    </AppLayout>
  );
}
