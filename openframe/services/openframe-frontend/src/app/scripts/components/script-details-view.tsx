'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Edit2, Calendar, Play } from 'lucide-react'
import { InfoCard } from '@flamingo/ui-kit'
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
    router.push(`/scripts/edit?id=${scriptId}`)
  }

  const handleScheduleScript = () => {
    console.log('Schedule script:', scriptDetails?.id)
  }

  const handleRunScript = () => {
    console.log('Run script:', scriptDetails?.id)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-[#3a3a3a] rounded mb-6" />
          <div className="bg-[#212121] border border-[#3a3a3a] rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-20 bg-[#3a3a3a] rounded mb-2" />
                  <div className="h-6 w-32 bg-[#3a3a3a] rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
          <p className="text-red-400">Error loading script: {error}</p>
        </div>
      </div>
    )
  }

  if (!scriptDetails) {
    return (
      <div className="p-6">
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <p className="text-yellow-400">Script not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Section */}
      <div className="flex items-end justify-between gap-4 pl-6 pr-6">
        <div className="flex flex-col gap-2 flex-1">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 p-3 rounded-[6px] hover:bg-[#2a2a2a] transition-colors self-start"
          >
            <ChevronLeft className="h-6 w-6 text-[#888888]" />
            <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#888888]">
              Back to Scripts
            </span>
          </button>

          {/* Script Name */}
          <h1 className="font-['Azeret_Mono'] font-semibold text-[32px] leading-[40px] tracking-[-0.64px] text-[#fafafa]">
            {scriptDetails.name}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 items-center">
          <button
            onClick={handleEditScript}
            className="bg-[#212121] border border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
          >
            <Edit2 size={24} />
            Edit Script
          </button>
          <button
            onClick={handleScheduleScript}
            className="bg-[#212121] border border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
          >
            <Calendar size={24} />
            Schedule Script
          </button>
          <button
            onClick={handleRunScript}
            className="bg-[#ffc008] hover:bg-[#ffd951] text-[#212121] px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
          >
            <Play size={24} />
            Run Script
          </button>
        </div>
      </div>

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
          <div className="bg-[#212121] border border-[#3a3a3a] rounded-lg mt-6">
            <div className="p-4 border-b border-[#3a3a3a]">
              <h3 className="text-[#888888] text-xs font-semibold uppercase tracking-wider">SYNTAX</h3>
            </div>
            <div className="bg-[#161616] rounded-md border border-[#3a3a3a] relative h-[400px] overflow-y-auto overflow-x-auto">
              <div className="flex">
                <div className="w-12 bg-[#161616] py-3 px-2 overflow-hidden">
                  <div className="text-right text-[#b8b8b8] text-sm font-mono leading-relaxed whitespace-pre">
                    {scriptDetails.script_body.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                </div>
                <div className="py-3 px-2">
                  <pre className="text-[#b8b8b8] text-sm font-mono leading-relaxed whitespace-pre">
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
        <div className="bg-[#212121] border border-[#3a3a3a] rounded-lg mt-6">
          <div className="p-4 border-b border-[#3a3a3a]">
            <h3 className="text-[#fafafa] font-semibold">Scheduled Runs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#3a3a3a]">
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wider">Date & Time ↑</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wider">Repeat ⌄</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wider">Devices ↑</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3a3a3a]">
                {/* // TODO: schedules runs */}
              </tbody>
            </table>
          </div>
        </div>

        {/* Execution History */}
        <div className="bg-[#212121] border border-[#3a3a3a] rounded-lg mt-6">
          <div className="p-4 border-b border-[#3a3a3a]">
            <h3 className="text-[#888888] text-xs font-semibold uppercase tracking-wider">EXECUTION HISTORY</h3>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {/* // TODO: execution history */}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
