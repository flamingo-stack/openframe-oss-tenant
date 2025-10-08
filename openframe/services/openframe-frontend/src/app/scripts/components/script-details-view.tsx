'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Edit2, Calendar, Play } from 'lucide-react'
import { InfoCard, Button, CardLoader, DetailPageContainer, LoadError, NotFoundError } from '@flamingo/ui-kit'
import { useScriptDetails } from '../hooks/use-script-details'
import { ScriptInfoSection } from './script-info-section'

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

  const handleScheduleScript = () => {
    console.log('Schedule script:', scriptDetails?.id)
  }

  const handleRunScript = () => {
    if (scriptDetails?.id) {
      router.push(`/scripts/details/${scriptDetails.id}/run`)
    }
  }

  if (isLoading) {
    return <CardLoader items={4} />
  }

  if (error) {
    return <LoadError message={`Error loading script: ${error}`} />
  }

  if (!scriptDetails) {
    return <NotFoundError message="Script not found" />
  }

  const headerActions = (
    <>
      <Button
        onClick={handleEditScript}
        variant="outline"
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
        leftIcon={<Edit2 size={24} />}
      >
        Edit Script
      </Button>
      <Button
        onClick={handleScheduleScript}
        variant="outline"
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
        leftIcon={<Calendar size={24} />}
      >
        Schedule Script
      </Button>
      <Button
        onClick={handleRunScript}
        variant="primary"
        className="bg-ods-accent hover:bg-ods-accent-hover text-ods-text-on-accent px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
        leftIcon={<Play size={24} />}
      >
        Run Script
      </Button>
    </>
  )

  return (
    <DetailPageContainer
      title={scriptDetails.name}
      backButton={{
        label: 'Back to Scripts',
        onClick: handleBack
      }}
      headerActions={headerActions}
    >

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <ScriptInfoSection script={scriptDetails} />

        {/* Script Arguments and Environment Variables */}
        {(scriptDetails.args?.length > 0 || scriptDetails.env_vars?.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Script Arguments */}
            {scriptDetails.args?.length > 0 && (
              <InfoCard
                data={{
                  title: 'SCRIPT ARGUMENTS',
                  items: scriptDetails.args.map((arg: string) => {
                    const [key, value] = arg.includes('=') ? arg.split('=') : [arg, ''];
                    return { label: key, value: value || '' };
                  })
                }}
              />
            )}

            {/* Environment Variables */}
            {scriptDetails.env_vars?.length > 0 && (
              <InfoCard
                data={{
                  title: 'ENVIRONMENT VARS',
                  items: scriptDetails.env_vars.map((envVar: string) => {
                    const [key, value] = envVar.includes('=') ? envVar.split('=') : [envVar, ''];
                    return { label: key, value: value || '' };
                  })
                }}
              />
            )}
          </div>
        )}

        {/* Script Syntax */}
        {scriptDetails.script_body && (
          <div className="bg-ods-card border border-ods-border rounded-lg mt-6">
            <div className="p-4 border-b border-ods-border">
              <h3 className="text-ods-text-secondary text-xs font-semibold uppercase tracking-wider">SYNTAX</h3>
            </div>
            <div className="bg-ods-bg rounded-md border border-ods-border relative h-[400px] overflow-y-auto overflow-x-auto">
              <div className="flex">
                <div className="w-12 bg-ods-bg py-3 px-2 overflow-hidden">
                  <div className="text-right text-ods-text-muted text-sm font-mono leading-relaxed whitespace-pre">
                    {scriptDetails.script_body.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                </div>
                <div className="py-3 px-2">
                  <pre className="text-ods-text-muted text-sm font-mono leading-relaxed whitespace-pre">
                    <code className="language-bash">
                      {scriptDetails.script_body}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scheduled Runs */}
        <div className="bg-ods-card border border-ods-border rounded-lg mt-6">
          <div className="p-4 border-b border-ods-border">
            <h3 className="text-ods-text-primary font-semibold">Scheduled Runs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ods-border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-ods-text-secondary uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ods-text-secondary uppercase tracking-wider">Date & Time ↑</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ods-text-secondary uppercase tracking-wider">Repeat ⌄</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ods-text-secondary uppercase tracking-wider">Devices ↑</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ods-text-secondary uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ods-border">
                {/* // TODO: schedules runs */}
              </tbody>
            </table>
          </div>
        </div>

        {/* Execution History */}
        <div className="bg-ods-card border border-ods-border rounded-lg mt-6">
          <div className="p-4 border-b border-ods-border">
            <h3 className="text-ods-text-secondary text-xs font-semibold uppercase tracking-wider">EXECUTION HISTORY</h3>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {/* // TODO: execution history */}
            </div>
          </div>
        </div>
      </div>
    </DetailPageContainer>
  )
}
