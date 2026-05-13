'use client';

import { Skeleton, type TabItem, TabNavigation } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo, useState } from 'react';
import { CustomersAssignedTable } from './tables/customers-assigned-table';
import { DevicesAssignedTable } from './tables/devices-assigned-table';
import { KnowledgeBaseAssignedTable } from './tables/knowledge-base-assigned-table';
import { TicketsAssignedTable } from './tables/tickets-assigned-table';
import { TARGET_CONFIG } from './target-config';
import { ASSIGNMENT_TARGET_TYPES, type AssignmentItemType, type AssignmentTargetType } from './types';
import { useAssignedItems } from './use-assigned-items';

export interface AssignedItemsViewProps {
  itemId: string;
  itemType: AssignmentItemType;
  className?: string;
}

export function AssignedItemsView({ itemId, itemType, className }: AssignedItemsViewProps) {
  const { value, customers, devices, articles, tickets, isLoading } = useAssignedItems({ itemId, itemType });

  const activeTypes = useMemo(() => ASSIGNMENT_TARGET_TYPES.filter(type => (value[type]?.length ?? 0) > 0), [value]);

  const [pinnedTab, setPinnedTab] = useState<AssignmentTargetType | null>(null);
  const activeTab = pinnedTab && activeTypes.includes(pinnedTab) ? pinnedTab : activeTypes[0];

  const tabs: TabItem[] = useMemo(
    () =>
      activeTypes.map(type => ({
        id: type,
        label: TARGET_CONFIG[type].tabLabel,
        icon: TARGET_CONFIG[type].icon as TabItem['icon'],
      })),
    [activeTypes],
  );

  const renderTabBody = (type: AssignmentTargetType) => {
    switch (type) {
      case 'ORGANIZATION':
        return <CustomersAssignedTable customers={customers ?? []} isLoading={isLoading} />;
      case 'DEVICE':
        return <DevicesAssignedTable devices={devices ?? []} isLoading={isLoading} />;
      case 'KNOWLEDGE_ARTICLE':
        return <KnowledgeBaseAssignedTable articles={articles ?? []} isLoading={isLoading} />;
      case 'TICKET':
        return <TicketsAssignedTable tickets={tickets ?? []} isLoading={isLoading} />;
    }
  };

  if (isLoading && activeTypes.length === 0) {
    return (
      <section className={className}>
        <h3 className="text-h3 text-ods-text-primary mb-[var(--spacing-system-mf)]">Assigned Items</h3>
        <Skeleton className="h-12 w-full" />
      </section>
    );
  }

  if (activeTypes.length === 0) return null;

  return (
    <section className={className}>
      <h3 className="text-h3 text-ods-text-primary mb-[var(--spacing-system-mf)]">Assigned Items</h3>

      {activeTypes.length === 1 ? (
        renderTabBody(activeTypes[0])
      ) : (
        <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={id => setPinnedTab(id as AssignmentTargetType)}>
          {active => (
            <div className="mt-[var(--spacing-system-mf)]">{renderTabBody(active as AssignmentTargetType)}</div>
          )}
        </TabNavigation>
      )}
    </section>
  );
}
