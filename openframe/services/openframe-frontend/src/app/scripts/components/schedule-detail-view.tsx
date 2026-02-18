'use client'

import {
  DetailPageContainer,
  LoadError,
  NotFoundError,
  TabContent,
  TabNavigation,
  getTabComponent,
  type TabItem,
} from '@flamingo-stack/openframe-frontend-core'
import { BracketCurlyIcon, ClockHistoryIcon, MonitorIcon, PenEditIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useScriptSchedule } from '../hooks/use-script-schedule'
import { ScheduleDetailLoader } from './schedule-detail-loader'
import { ScheduleInfoBar } from './schedule-info-bar'
import { ScheduleScriptsTab } from './schedule-scripts-tab'
import { ScheduleDevicesTab } from './schedule-devices-tab'
import { ScheduleHistoryTab } from './schedule-history-tab'

interface ScheduleDetailViewProps {
  scheduleId: string
}

const SCHEDULE_TABS: TabItem[] = [
  {
    id: 'scripts',
    label: 'Scheduled Scripts',
    icon: BracketCurlyIcon,
    component: ScheduleScriptsTab,
  },
  {
    id: 'devices',
    label: 'Assigned Devices',
    icon: MonitorIcon,
    component: ScheduleDevicesTab,
  },
  {
    id: 'history',
    label: 'Execution History',
    icon: ClockHistoryIcon,
    component: ScheduleHistoryTab,
  },
]

export function ScheduleDetailView({ scheduleId }: ScheduleDetailViewProps) {
  const router = useRouter()
  const { schedule, isLoading, error } = useScriptSchedule(scheduleId)

  const handleBack = () => {
    router.push('/scripts/?tab=schedules')
  }

  const handleEditSchedule = () => {
    router.push(`/scripts/schedules/${scheduleId}/edit`)
  }

  const actions = useMemo(
    () => [{
      label: 'Edit Schedule',
      onClick: handleEditSchedule,
      icon: <PenEditIcon size={20} />,
    }],
    [handleEditSchedule],
  )

  if (isLoading) {
    return <ScheduleDetailLoader />
  }

  if (error) {
    return <LoadError message={`Error loading schedule: ${error}`} />
  }

  if (!schedule) {
    return <NotFoundError message="Schedule not found" />
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
          <TabNavigation tabs={SCHEDULE_TABS} defaultTab="scripts" urlSync={true}>
            {(activeTab) => (
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
  )
}
