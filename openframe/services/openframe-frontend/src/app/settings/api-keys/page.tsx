'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../../components/app-layout';
import { ApiKeysTab } from '../components/tabs/api-keys';

export default function ApiKeysPage() {
  return (
    <AppLayout mainClassName="pt-0 sm:pt-0">
      <ApiKeysTab />
    </AppLayout>
  );
}
