'use client'

import { CardLoader, DetailPageContainer, LoadError, NotFoundError, ScriptInfoSection } from '@flamingo-stack/openframe-frontend-core'
import { CalendarIcon, PenEditIcon, PlayIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2'
import { featureFlags } from '@lib/feature-flags'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useScriptDetails } from '../hooks/use-script-details'
import { ScheduledRunsSection } from './scheduled-runs-section'
import { ScriptArgumentsCard } from './script-arguments-card'
import { ScriptEditor } from './script-editor'

interface ScriptDetailsViewProps {
  scriptId: string
}

export function ScriptDetailsView({ scriptId }: ScriptDetailsViewProps) {
  const router = useRouter()
  const { scriptDetails, isLoading, error } = useScriptDetails(scriptId)

  const handleBack = () => {
    router.push('/scripts')
  }

  const handleEditScript = () => {
    router.push(`/scripts/edit/${scriptId}`)
  }

  const handleRunScript = () => {
    if (scriptDetails?.id) {
      router.push(`/scripts/details/${scriptDetails.id}/run`)
    }
  }

  const handleScheduleScript = () => {
    if (scriptDetails?.id) {
      router.push(`/scripts/details/${scriptDetails.id}/schedule`)
    }
  }
  const isScheduleEnabled = featureFlags.scriptSchedule.enabled()

  const menuActions = useMemo(() => [
    {
      label: 'Edit Script',
      icon: <PenEditIcon size={20} />,
      onClick: handleEditScript,
    },
    ...(isScheduleEnabled ? [{
      label: 'Schedule Script',
      icon: <CalendarIcon size={20} />,
      onClick: handleScheduleScript,
    }] : [])
  ], [handleEditScript, handleScheduleScript, isScheduleEnabled])

  const actions = useMemo(() => [
    {
      label: 'Run Script',
      icon: <PlayIcon size={20} />,
      onClick: handleRunScript,
      variant: 'primary' as const,
    }
  ], [handleRunScript])

  if (isLoading) {
    return <CardLoader items={4} />
  }

  if (error) {
    return <LoadError message={`Error loading script: ${error}`} />
  }

  if (!scriptDetails) {
    return <NotFoundError message="Script not found" />
  }


  return (
    <DetailPageContainer
      title={scriptDetails.name}
      backButton={{
        label: 'Back to Scripts',
        onClick: handleBack
      }}
      actions={actions}
      menuActions={menuActions}
      actionsVariant="menu-primary"
    >

      {/* Main Content */}
      <div className="flex flex-col overflow-auto gap-6">
        <ScriptInfoSection 
          headline={scriptDetails.description}
          subheadline={'Description'}
          shellType={scriptDetails.shell}
          supportedPlatforms={scriptDetails.supported_platforms}
          category={scriptDetails.category} 
        />

        {/* Script Arguments and Environment Variables */}
        {(scriptDetails.args?.length > 0 || scriptDetails.env_vars?.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scriptDetails.args?.length > 0 ? (
              <ScriptArgumentsCard
                title="Default Script Arguments"
                args={scriptDetails.args}
              />
            ) : (
              <div />
            )}
            {scriptDetails.env_vars?.length > 0 && (
              <ScriptArgumentsCard
                title="Environment Vars"
                args={scriptDetails.env_vars}
              />
            )}
          </div>
        )}

        {/* Script Syntax */}
        {scriptDetails.script_body && (
          <div className="flex flex-col gap-1">
            <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary w-full">
              Syntax
            </div>
            <ScriptEditor
              value={scriptDetails.script_body}
              shell={scriptDetails.shell}
              readOnly
              height="400px"
            />
          </div>
        )}

        {/* Scheduled Runs Section */}
        {isScheduleEnabled && <ScheduledRunsSection scriptId={scriptId} />}
      </div>
    </DetailPageContainer>
  )
}
