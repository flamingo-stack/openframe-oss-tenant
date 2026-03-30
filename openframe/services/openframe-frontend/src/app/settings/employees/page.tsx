'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../../components/app-layout';
import { CompanyAndUsersTab } from '../components/tabs/company-and-users';

export default function EmployeesPage() {
  return (
    <AppLayout mainClassName="pt-0 sm:pt-0">
      <CompanyAndUsersTab />
    </AppLayout>
  );
}
