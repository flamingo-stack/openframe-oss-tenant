'use client';

import {
  DetailPageContainer,
  getTabComponent,
  LoadError,
  NotFoundError,
  TabContent,
  type TabItem,
  TabNavigation,
} from '@flamingo-stack/openframe-frontend-core';
import {
  BracketCurlyIcon,
  ClockHistoryIcon,
  MonitorIcon,
  PenEditIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useScriptSchedule } from '../../hooks/use-script-schedule';
import { ScheduleDetailSkeleton } from './schedule-details-skeleton';
import { ScheduleDevicesTab } from './schedule-devices-tab';
import { ScheduleHistoryTab } from './schedule-history-tab';
import { ScheduleInfoBar } from './schedule-info-bar';
import { ScheduleScriptsTab } from './schedule-scripts-tab';

interface ScheduleDetailViewProps {
  scheduleId: string;
}

const SCHEDULE_TAB_IDS = ['schedule-scripts', 'schedule-devices', 'schedule-history'] as const;
const DEFAULT_SCHEDULE_TAB = 'schedule-scripts';

const SCHEDULE_TABS: TabItem[] = [
  {
    id: 'schedule-scripts',
    label: 'Scheduled Scripts',
    icon: BracketCurlyIcon,
    component: ScheduleScriptsTab,
  },
  {
    id: 'schedule-devices',
    label: 'Assigned Devices',
    icon: MonitorIcon,
    component: ScheduleDevicesTab,
  },
  {
    id: 'schedule-history',
    label: 'Execution History',
    icon: ClockHistoryIcon,
    component: ScheduleHistoryTab,
  },
];

export function ScheduleDetailView({ scheduleId }: ScheduleDetailViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { schedule, isLoading, error } = useScriptSchedule(scheduleId);

  const requestedTab = searchParams?.get('tab') ?? DEFAULT_SCHEDULE_TAB;
  const activeTab = (SCHEDULE_TAB_IDS as readonly string[]).includes(requestedTab)
    ? requestedTab
    : DEFAULT_SCHEDULE_TAB;

  // Controlled mode for TabNavigation: URL is the single source of truth.
  // Avoids a flicker bug in `urlSync` mode where the internal sync effect
  // briefly resets the active tab to the URL's previous value during navigation.
  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('tab', tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleBack = useCallback(() => {
    router.push('/scripts/?tab=schedules');
  }, [router]);

  const handleEditDevices = useCallback(() => {
    router.push(`/scripts/schedules/${scheduleId}/devices`);
  }, [router, scheduleId]);

  const handleEditSchedule = useCallback(() => {
    router.push(`/scripts/schedules/${scheduleId}/edit`);
  }, [router, scheduleId]);

  const actions = useMemo(
    () => [
      {
        label: 'Edit Devices',
        variant: 'card' as const,
        onClick: handleEditDevices,
        icon: <PenEditIcon size={20} />,
      },
      {
        label: 'Edit Schedule',
        variant: 'card' as const,
        onClick: handleEditSchedule,
        icon: <PenEditIcon size={20} />,
      },
    ],
    [handleEditSchedule, handleEditDevices],
  );

  if (isLoading) {
    return <ScheduleDetailSkeleton />;
  }

  if (error) {
    return <LoadError message={`Error loading schedule: ${error}`} />;
  }

  if (!schedule) {
    return <NotFoundError message="Schedule not found" />;
  }

  return (
    <DetailPageContainer
      title={schedule.name}
      backButton={{ label: 'Back to Script Schedules', onClick: handleBack }}
      actions={actions}
      actionsVariant="icon-buttons"
      padding="none"
      className="p-[var(--spacing-system-l)]"
    >
      <div className="flex-1 overflow-auto">
        {/* Schedule info bar */}
        <div className="pt-6">
          <ScheduleInfoBar schedule={schedule} />
        </div>

        {/* Tab Navigation */}
        <div className="mt-6">
          <TabNavigation tabs={SCHEDULE_TABS} activeTab={activeTab} onTabChange={handleTabChange} showRightGradient>
            {tabId => (
              <div className="pt-6">
                <TabContent
                  activeTab={tabId}
                  TabComponent={getTabComponent(SCHEDULE_TABS, tabId)}
                  componentProps={{ schedule, scheduleId }}
                />
              </div>
            )}
          </TabNavigation>
        </div>
      </div>
    </DetailPageContainer>
  );
}
