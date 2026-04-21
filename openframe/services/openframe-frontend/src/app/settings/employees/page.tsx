'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../../components/app-layout';
import { CompanyAndUsersTab } from '../components/tabs/company-and-users';

export default function EmployeesPage() {
  return (
    <AppLayout>
      <CompanyAndUsersTab />
    </AppLayout>
  );
}
