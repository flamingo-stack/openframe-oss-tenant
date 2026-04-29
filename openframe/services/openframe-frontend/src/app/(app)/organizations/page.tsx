'use client';

export const dynamic = 'force-dynamic';

import { getTabComponent } from '@flamingo-stack/openframe-frontend-core';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { ORGANIZATIONS_TABS, OrganizationsTabNavigation } from './components/organizations-tabs';

export default function Organizations() {
  const { params, setParam } = useApiParams({
    tab: { type: 'string', default: 'active' },
  });

  const TabComponent = getTabComponent(ORGANIZATIONS_TABS, params.tab);

  return (
    <div className="p-4 md:p-6 flex flex-col w-full -mt-4">
      <OrganizationsTabNavigation activeTab={params.tab} onTabChange={tab => setParam('tab', tab)} />
      {TabComponent ? <TabComponent /> : null}
    </div>
  );
}
