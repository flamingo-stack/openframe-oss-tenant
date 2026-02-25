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
import { useRouter } from 'next/navigation';
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
  const { schedule, isLoading, error } = useScriptSchedule(scheduleId);

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
        onClick: handleEditDevices,
        icon: <PenEditIcon size={20} />,
      },
      {
        label: 'Edit Schedule',
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
    >
      <div className="flex-1 overflow-auto">
        {/* Schedule info bar */}
        <div className="pt-6">
          <ScheduleInfoBar schedule={schedule} />
        </div>

        {/* Tab Navigation */}
        <div className="mt-6">
          <TabNavigation tabs={SCHEDULE_TABS} defaultTab="schedule-scripts" urlSync={true}>
            {activeTab => (
              <div className="pt-6">
                <TabContent
                  activeTab={activeTab}
                  TabComponent={getTabComponent(SCHEDULE_TABS, activeTab)}
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
