'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../components/app-layout';
import { OrganizationsTable } from './components/organizations-table';

export default function Organizations() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <OrganizationsTable />
      </div>
    </AppLayout>
  );
}
