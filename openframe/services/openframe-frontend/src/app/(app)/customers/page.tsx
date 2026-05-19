'use client';

export const dynamic = 'force-dynamic';

import { getTabComponent } from '@flamingo-stack/openframe-frontend-core';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { CUSTOMERS_TABS, CustomersTabNavigation } from './components/customers-tabs';

export default function Organizations() {
  const { params, setParam } = useApiParams({
    tab: { type: 'string', default: 'active' },
  });

  const TabComponent = getTabComponent(CUSTOMERS_TABS, params.tab);

  return (
    <div className="flex flex-col w-full">
      <CustomersTabNavigation activeTab={params.tab} onTabChange={tab => setParam('tab', tab)} />
      {TabComponent ? <TabComponent /> : null}
    </div>
  );
}
