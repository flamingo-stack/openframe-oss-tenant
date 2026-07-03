'use client';

import { getTabComponent } from '@flamingo-stack/openframe-frontend-core';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { CUSTOMERS_TABS, CustomersTabNavigation } from './components/customers-tabs';

export default function Organizations() {
  // `search` is declared here too (owned by CustomersTable) so we can clear it on
  // a tab switch — each tab starts with a fresh search.
  const { params, setParams } = useApiParams({
    tab: { type: 'string', default: 'active' },
    search: { type: 'string', default: '' },
  });

  const TabComponent = getTabComponent(CUSTOMERS_TABS, params.tab);

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col w-full">
        <CustomersTabNavigation activeTab={params.tab} onTabChange={tab => setParams({ tab, search: '' })} />
        {TabComponent ? <TabComponent /> : null}
      </div>
    </div>
  );
}
