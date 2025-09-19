'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronLeft, Check, ArrowLeft } from 'lucide-react'
import { tacticalApiClient } from '../../../lib/tactical-api-client'
import { useScriptDetails } from '../hooks/use-script-details'
import { Button } from '@flamingo/ui-kit/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@flamingo/ui-kit/components/ui'
import { Card } from '@flamingo/ui-kit/components/ui'
import { useToast } from '@flamingo/ui-kit/hooks'
import { LinuxIcon, MacOSIcon, WindowsIcon } from '@flamingo/ui-kit'

interface ScriptData {
  name: string
  type: string
  default_timeout: number
  args: Array<{ name: string; value: string }>
  content: string
  run_as_user: boolean
  env_vars: Array<{ name: string; value: string }>
  description: string
  supported_platforms: string[]
  category: string
}

interface EditScriptPageProps {
  scriptId: string | null
}

const PLATFORMS = [
  { id: 'windows', name: 'Windows', icon: WindowsIcon },
  { id: 'linux', name: 'Linux', icon: LinuxIcon },
  { id: 'darwin', name: 'MacOS', icon: MacOSIcon }
]

const SHELL_TYPES = ['bash', 'powershell', 'python', 'batch', 'shell']
const CATEGORIES = ['System Maintenance', 'Security', 'Network', 'Monitoring', 'Backup', 'Custom']

export function EditScriptPage({ scriptId }: EditScriptPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { scriptDetails, isLoading: isLoadingScript, error: scriptError } = useScriptDetails(scriptId || '')

  const [scriptData, setScriptData] = useState<ScriptData>({
    name: '',
    type: '',
    default_timeout: 90,
    args: [],
    content: '',
    run_as_user: false,
    env_vars: [],
    description: '',
    supported_platforms: ['linux'],
    category: 'System Maintenance'
  })

  const [isLoading, setIsLoading] = useState(false)

  const isEditMode = !!scriptId

  useEffect(() => {
    if (scriptDetails && isEditMode) {
      setScriptData({
        name: scriptDetails.name,
        type: scriptDetails.shell,
        default_timeout: scriptDetails.default_timeout,
        args: scriptDetails.args?.map((arg: string) => ({ name: arg, value: '' })) || [],
        content: scriptDetails.script_body || '',
        run_as_user: scriptDetails.run_as_user,
        env_vars: scriptDetails.env_vars?.map((envVar: string) => {
          const [name, value] = envVar.split('=')
          return { name: name || '', value: value || '' }
        }) || [],
        description: scriptDetails.description,
        supported_platforms: scriptDetails.supported_platforms || [],
        category: scriptDetails.category
      })
    }
  }, [scriptDetails, isEditMode])

  const handleBack = () => {
    router.push('/scripts')
  }

  const handlePlatformToggle = (platformId: string) => {
    setScriptData(prev => ({
      ...prev,
      supported_platforms: prev.supported_platforms.includes(platformId)
        ? prev.supported_platforms.filter(p => p !== platformId)
        : [...prev.supported_platforms, platformId]
    }))
  }

  const addScriptArgument = () => {
    setScriptData(prev => ({
      ...prev,
      args: [...prev.args, { name: '', value: '' }]
    }))
  }

  const updateScriptArgument = (index: number, field: 'name' | 'value', value: string) => {
    setScriptData(prev => ({
      ...prev,
      args: prev.args.map((arg, i) =>
        i === index ? { ...arg, [field]: value } : arg
      )
    }))
  }


  const addEnvironmentVar = () => {
    setScriptData(prev => ({
      ...prev,
      env_vars: [...prev.env_vars, { name: '', value: '' }]
    }))
  }

  const updateEnvironmentVar = (index: number, field: 'name' | 'value', value: string) => {
    setScriptData(prev => ({
      ...prev,
      env_vars: prev.env_vars.map((envVar, i) =>
        i === index ? { ...envVar, [field]: value } : envVar
      )
    }))
  }


  const handleSave = async () => {
    try {
      setIsLoading(true)

      // Filter out empty arguments and environment variables
      const filteredArgs = scriptData.args.filter(arg => arg.name.trim() !== '')
      const filteredEnvVars = scriptData.env_vars.filter(envVar => envVar.name.trim() !== '')

      const payload = {
        name: scriptData.name,
        shell: scriptData.type,
        default_timeout: scriptData.default_timeout,
        args: filteredArgs.map(arg => arg.name),
        script_body: scriptData.content,
        run_as_user: scriptData.run_as_user,
        env_vars: filteredEnvVars.map(envVar => `${envVar.name}=${envVar.value}`),
        description: scriptData.description,
        supported_platforms: scriptData.supported_platforms,
        category: scriptData.category
      }

      if (isEditMode && scriptId) {
        // Update existing script
        await tacticalApiClient.updateScript(scriptId, payload)
        toast({
          title: 'Success',
          description: 'Script updated successfully',
          variant: 'success'
        })
      } else {
        // Create new script
        await tacticalApiClient.createScript(payload)
        toast({
          title: 'Success',
          description: 'Script created successfully',
          variant: 'success'
        })
      }

      router.push('/scripts')
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save script',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingScript) {
    return (
      <div className="min-h-screen bg-[#161616] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-[#212121] rounded w-64 mb-6"></div>
            <div className="bg-[#212121] rounded-lg p-6">
              <div className="space-y-4">
                <div className="h-4 bg-[#3a3a3a] rounded w-32"></div>
                <div className="h-32 bg-[#3a3a3a] rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (scriptError && isEditMode) {
    return (
      <div className="min-h-screen bg-[#161616] p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-red-900/20 border border-red-600/30 p-6">
            <h2 className="text-red-400 text-xl font-semibold mb-2">Error Loading Script</h2>
            <p className="text-red-300">{scriptError}</p>
            <Button
              onClick={handleBack}
              variant="destructive"
              className="mt-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Scripts
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#161616]">
      {/* Content */}
      <div className="px-6 pb-6">
        {/* Title Bar */}
        <div className="border-b border-[#3a3a3a] pb-10 pt-6">
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-2">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-[#888888] hover:text-[#fafafa] transition-colors px-0 py-3"
              >
                <ChevronLeft className="w-6 h-6" />
                <span className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium">Back to Scripts</span>
              </button>
              <h1 className="text-[32px] font-['Azeret_Mono:SemiBold',_sans-serif] font-semibold text-[#fafafa] tracking-[-0.64px]">
                {isEditMode && scriptDetails ? scriptDetails.name : 'New Script'}
              </h1>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => toast({ title: 'Test Script', description: 'Feature coming soon', variant: 'default' })}
                variant="outline"
                className="bg-[#212121] border-[#3a3a3a] text-[#fafafa] hover:bg-[#2a2a2a] h-12 px-4 text-lg font-bold"
              >
                Test Script
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading || !scriptData.name.trim()}
                className="bg-[#ffc008] text-[#212121] hover:bg-[#ffd951] disabled:opacity-50 h-12 px-4 text-lg font-bold"
              >
                {isLoading ? 'Saving...' : 'Save Script'}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-10 pt-10">
          {/* Supported Platform Section */}
          <div className="space-y-1">
            <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa]">Supported Platform</label>
            <div className="flex gap-4 pt-2">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon
                const isSelected = scriptData.supported_platforms.includes(platform.id)
                return (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformToggle(platform.id)}
                    className={`flex-1 h-16 px-4 py-3 rounded-md flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-[#7f6004] border border-[#ffc008]'
                        : 'bg-[#212121] border border-[#3a3a3a] hover:bg-[#2a2a2a]'
                    }`}
                  >
                    <Icon className="w-6 h-6 text-[#fafafa]" />
                    <span className="flex-1 text-left text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa]">
                      {platform.name}
                    </span>
                    {isSelected && <Check className="w-6 h-6 text-[#ffc008]" />}
                  </button>
                )
              })}
              <div className={`flex-1 h-16 px-4 py-3 rounded-md border border-[#3a3a3a] flex items-center justify-between ${
                scriptData.run_as_user ? 'bg-[#212121]' : 'bg-[#212121]'
              }`}>
                <input
                  type="checkbox"
                  checked={scriptData.run_as_user}
                  onChange={(e) => setScriptData(prev => ({ ...prev, run_as_user: e.target.checked }))}
                  className="w-6 h-6 rounded border-2 border-[#3a3a3a] bg-[#212121] checked:bg-[#ffc008] checked:border-[#ffc008] focus:ring-0 focus:ring-offset-0"
                />
                <div className="flex-1 ml-3">
                  <div className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#3a3a3a]">Run as User</div>
                  <div className="text-sm font-['DM_Sans:Medium',_sans-serif] font-medium text-[#3a3a3a]">Windows Only</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields Row 1 */}
          <div className="flex gap-6">
            <div className="flex-1 space-y-1">
              <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa]">Name</label>
              <div className="bg-[#212121] rounded-md border border-[#3a3a3a] px-3 py-3 h-[60px] flex items-center">
                <input
                  type="text"
                  value={scriptData.name}
                  onChange={(e) => setScriptData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa] outline-none placeholder:text-[#888888]"
                  placeholder="Enter Script Name Here"
                />
              </div>
            </div>
            
            <div className="flex-1 space-y-1">
              <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa]">Shell Type</label>
              <Select
                value={scriptData.type}
                onValueChange={(value) => setScriptData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="w-full bg-[#212121] border border-[#3a3a3a] px-3 py-3 font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa] hover:bg-[#2a2a2a] focus:ring-0 rounded-md">
                  <SelectValue placeholder="Select Shell Type"/>
                </SelectTrigger>
                <SelectContent>
                  {SHELL_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 space-y-1">
              <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa]">Category</label>
              <Select
                value={scriptData.category}
                onValueChange={(value) => setScriptData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="w-full bg-[#212121] border border-[#3a3a3a] px-3 py-3 font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa] hover:bg-[#2a2a2a] focus:ring-0 rounded-md">
                  <SelectValue placeholder="Select Category"/>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 space-y-1">
              <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa]">Timeout</label>
              <div className="bg-[#212121] rounded-md border border-[#3a3a3a] px-3 py-3 h-[60px] flex items-center gap-2">
                <input
                  type="number"
                  value={scriptData.default_timeout}
                  onChange={(e) => setScriptData(prev => ({ ...prev, default_timeout: parseInt(e.target.value) || 90 }))}
                  className="flex-1 bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa] outline-none placeholder:text-[#888888]"
                  placeholder="90"
                />
                <span className="text-sm font-['DM_Sans:Medium',_sans-serif] font-medium text-[#888888]">Seconds</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa]">Description</label>
            <div className="bg-[#212121] rounded-md border border-[#3a3a3a] relative">
              <textarea
                value={scriptData.description}
                onChange={(e) => setScriptData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa] outline-none placeholder:text-[#888888] p-3 resize-none"
                placeholder="Enter Script Description"
              />
            </div>
          </div>

          {/* Script Arguments and Environment Variables Row */}
          <div className="flex gap-6">
            {/* Script Arguments */}
            <div className="flex-1">
              <div className="space-y-2">
                <div className="space-y-2">
                  <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa]">Script Arguments</label>
                  {scriptData.args.map((arg, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1 bg-[#212121] rounded-md border border-[#3a3a3a] p-3">
                        <input
                          type="text"
                          value={arg.name}
                          onChange={(e) => updateScriptArgument(index, 'name', e.target.value)}
                          className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa] outline-none placeholder:text-[#888888]"
                          placeholder="Enter Argument"
                        />
                      </div>
                      <div className="flex-1 bg-[#212121] rounded-md border border-[#3a3a3a] p-3">
                        <input
                          type="text"
                          value={arg.value}
                          onChange={(e) => updateScriptArgument(index, 'value', e.target.value)}
                          className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa] outline-none placeholder:text-[#888888]"
                          placeholder="Enter Value (empty=flag)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addScriptArgument}
                  className="flex items-center gap-2 text-[#fafafa] hover:text-[#ffc008] transition-colors py-3 px-0 font-['DM_Sans:Bold',_sans-serif] font-bold text-lg"
                >
                  <Plus className="w-6 h-6" />
                  <span>Add Script Argument</span>
                </button>
              </div>
            </div>

            {/* Environment Variables */}
            <div className="flex-1">
              <div className="space-y-2">
                <div className="space-y-2">
                  <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa]">Environment Vars</label>
                  {scriptData.env_vars.map((envVar, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1 bg-[#212121] rounded-md border border-[#3a3a3a] p-3">
                        <input
                          type="text"
                          value={envVar.name}
                          onChange={(e) => updateEnvironmentVar(index, 'name', e.target.value)}
                          className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa] outline-none placeholder:text-[#888888]"
                          placeholder="Enter Environment Var"
                        />
                      </div>
                      <div className="flex-1 bg-[#212121] rounded-md border border-[#3a3a3a] p-3">
                        <input
                          type="text"
                          value={envVar.value}
                          onChange={(e) => updateEnvironmentVar(index, 'value', e.target.value)}
                          className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa] outline-none placeholder:text-[#888888]"
                          placeholder="Enter Value"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addEnvironmentVar}
                  className="flex items-center gap-2 text-[#fafafa] hover:text-[#ffc008] transition-colors py-3 px-0 font-['DM_Sans:Bold',_sans-serif] font-bold text-lg"
                >
                  <Plus className="w-6 h-6" />
                  <span>Add Environment Vars</span>
                </button>
              </div>
            </div>
          </div>

          {/* Syntax/Script Content */}
          <div className="space-y-1">
            <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa]">Syntax</label>
            <div className="bg-[#161616] rounded-md border border-[#3a3a3a] relative">
              <div className="flex">
                <div className="w-12 bg-[#161616] py-3 px-2 overflow-hidden">
                  <div className="text-right text-[#888888] text-lg font-['DM_Sans:Medium',_sans-serif] font-medium leading-6">
                    {scriptData.content.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 relative">
                  <textarea
                    value={scriptData.content}
                    onChange={(e) => setScriptData(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-[#fafafa] outline-none p-3 resize-none font-mono leading-6 min-h-[600px]"
                    placeholder="#!/bin/bash\n\n# Your script content here..."
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}