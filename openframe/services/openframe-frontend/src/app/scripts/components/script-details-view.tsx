'use client'

import React, { useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Edit2, Play } from 'lucide-react'
import { InfoCard, Button, CardLoader, DetailPageContainer, LoadError, NotFoundError } from '@flamingo-stack/openframe-frontend-core'
import { useScriptDetails } from '../hooks/use-script-details'
import { ScriptInfoSection } from './script-info-section'

interface ScriptDetailsViewProps {
  scriptId: string
}

export function ScriptDetailsView({ scriptId }: ScriptDetailsViewProps) {
  const router = useRouter()
  const { scriptDetails, isLoading, error } = useScriptDetails(scriptId)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const handleCodeScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = (e.currentTarget as HTMLDivElement).scrollTop
    }
  }, [])

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
        leftIcon={<Edit2 size={20} />}
      >
        Edit Script
      </Button>
      <Button
        onClick={handleRunScript}
        variant="primary"
        leftIcon={<Play size={20} />}
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
            <div className="bg-ods-bg rounded-md border border-ods-border relative">
              <div className="flex">
                {/* Line numbers */}
                <div className="w-12 bg-ods-bg py-3 px-2">
                  <div ref={lineNumbersRef} className="h-[400px] overflow-y-auto">
                    <div className="text-right text-ods-text-secondary text-lg font-['DM_Sans:Medium',_sans-serif] font-medium leading-6">
                      {scriptDetails.script_body.split('\n').map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Code content with synced scroll */}
                <div className="flex-1 py-3 px-2">
                  <div className="h-[400px] overflow-y-auto" onScroll={handleCodeScroll}>
                    <pre className="text-ods-text-muted text-sm font-mono leading-relaxed whitespace-pre">
                      <code className="language-bash">
                        {scriptDetails.script_body}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DetailPageContainer>
  )
}
