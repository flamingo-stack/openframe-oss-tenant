'use client';

import { getTabComponent } from '@flamingo-stack/openframe-frontend-core';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { MONITORING_TABS, MonitoringTabNavigation } from './components/tabs/monitoring-tabs';

export default function Monitoring() {
  // `search` is declared here too (owned by the tabs) so we can clear it on
  // a tab switch — each tab starts with a fresh search.
  const { params, setParams } = useApiParams({
    tab: { type: 'string', default: 'policies' },
    search: { type: 'string', default: '' },
  });

  const TabComponent = getTabComponent(MONITORING_TABS, params.tab);

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col w-full">
        <MonitoringTabNavigation activeTab={params.tab} onTabChange={tab => setParams({ tab, search: '' })} />
        {TabComponent ? <TabComponent /> : null}
      </div>
    </div>
  );
}
