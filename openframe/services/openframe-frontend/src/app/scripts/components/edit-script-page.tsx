'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronLeft, Check, ArrowLeft } from 'lucide-react'
import { tacticalApiClient } from '../../../lib/tactical-api-client'
import { useScriptDetails } from '../hooks/use-script-details'
import { Button } from '@flamingo/ui-kit/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@flamingo/ui-kit/components/ui'
import { Card } from '@flamingo/ui-kit/components/ui'
import { FormLoader, FormPageContainer } from '@flamingo/ui-kit'
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
      <div className="min-h-screen bg-ods-bg">
        <div className="max-w-7xl mx-auto">
          <FormLoader items={6} containerClassName="p-6" />
        </div>
      </div>
    )
  }

  if (scriptError && isEditMode) {
    return (
      <div className="min-h-screen bg-ods-bg p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-error/20 border border-error p-6">
            <h2 className="text-error text-xl font-semibold mb-2">Error Loading Script</h2>
            <p className="text-error">{scriptError}</p>
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

  const headerActions = (
    <>
      <Button
        onClick={() => toast({ title: 'Test Script', description: 'Feature coming soon', variant: 'default' })}
        variant="outline"
        className="bg-ods-card border-ods-border text-ods-text-primary hover:bg-ods-bg-hover h-12 px-4 text-lg font-bold"
      >
        Test Script
      </Button>
      <Button
        onClick={handleSave}
        disabled={isLoading || !scriptData.name.trim()}
        className="bg-ods-accent text-ods-text-on-accent hover:bg-ods-accent-hover disabled:opacity-50 h-12 px-4 text-lg font-bold"
      >
        {isLoading ? 'Saving...' : 'Save Script'}
      </Button>
    </>
  )

  return (
    <FormPageContainer
      title={isEditMode && scriptDetails ? scriptDetails.name : 'New Script'}
      backButton={{
        label: 'Back to Scripts',
        onClick: handleBack
      }}
      headerActions={headerActions}
    >

        <div className="space-y-10 pt-10">
          {/* Supported Platform Section */}
          <div className="space-y-1">
            <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">Supported Platform</label>
            <div className="flex gap-4 pt-2">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon
                const isSelected = scriptData.supported_platforms.includes(platform.id)
                return (
                  <Button
                    key={platform.id}
                    onClick={() => handlePlatformToggle(platform.id)}
                    variant="ghost"
                    className={`flex-1 h-16 px-4 py-3 rounded-md flex items-center gap-2 transition-all justify-start ${
                      isSelected
                        ? 'bg-accent-active border border-accent-primary'
                        : 'bg-ods-card border border-ods-border hover:bg-ods-bg-hover'
                    }`}
                    leftIcon={<Icon className="w-6 h-6 text-ods-text-primary" />}
                    rightIcon={isSelected ? <Check className="w-6 h-6 text-ods-accent" /> : undefined}
                  >
                    <span className="flex-1 text-left text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">
                      {platform.name}
                    </span>
                  </Button>
                )
              })}
              <div className={`flex-1 h-16 px-4 py-3 rounded-md border border-ods-border flex items-center justify-between ${
                scriptData.run_as_user ? 'bg-ods-card' : 'bg-ods-card'
              }`}>
                <input
                  type="checkbox"
                  checked={scriptData.run_as_user}
                  onChange={(e) => setScriptData(prev => ({ ...prev, run_as_user: e.target.checked }))}
                  className="w-6 h-6 rounded border-2 border-ods-border bg-ods-card checked:bg-ods-accent checked:border-accent-primary focus:ring-0 focus:ring-offset-0"
                />
                <div className="flex-1 ml-3">
                  <div className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-disabled">Run as User</div>
                  <div className="text-sm font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-disabled">Windows Only</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields Row 1 */}
          <div className="flex gap-6">
            <div className="flex-1 space-y-1">
              <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">Name</label>
              <div className="bg-ods-card rounded-md border border-ods-border px-3 py-3 h-[60px] flex items-center">
                <input
                  type="text"
                  value={scriptData.name}
                  onChange={(e) => setScriptData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary outline-none placeholder:text-ods-text-secondary"
                  placeholder="Enter Script Name Here"
                />
              </div>
            </div>
            
            <div className="flex-1 space-y-1">
              <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">Shell Type</label>
              <Select
                value={scriptData.type}
                onValueChange={(value) => setScriptData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="w-full bg-ods-card border border-ods-border px-3 py-3 font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary hover:bg-ods-bg-hover focus:ring-0 rounded-md">
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
              <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">Category</label>
              <Select
                value={scriptData.category}
                onValueChange={(value) => setScriptData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="w-full bg-ods-card border border-ods-border px-3 py-3 font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary hover:bg-ods-bg-hover focus:ring-0 rounded-md">
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
              <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">Timeout</label>
              <div className="bg-ods-card rounded-md border border-ods-border px-3 py-3 h-[60px] flex items-center gap-2">
                <input
                  type="number"
                  value={scriptData.default_timeout}
                  onChange={(e) => setScriptData(prev => ({ ...prev, default_timeout: parseInt(e.target.value) || 90 }))}
                  className="flex-1 bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary outline-none placeholder:text-ods-text-secondary"
                  placeholder="90"
                />
                <span className="text-sm font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-secondary">Seconds</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">Description</label>
            <div className="bg-ods-card rounded-md border border-ods-border relative">
              <textarea
                value={scriptData.description}
                onChange={(e) => setScriptData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary outline-none placeholder:text-ods-text-secondary p-3 resize-none"
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
                  <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">Script Arguments</label>
                  {scriptData.args.map((arg, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1 bg-ods-card rounded-md border border-ods-border p-3">
                        <input
                          type="text"
                          value={arg.name}
                          onChange={(e) => updateScriptArgument(index, 'name', e.target.value)}
                          className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary outline-none placeholder:text-ods-text-secondary"
                          placeholder="Enter Argument"
                        />
                      </div>
                      <div className="flex-1 bg-ods-card rounded-md border border-ods-border p-3">
                        <input
                          type="text"
                          value={arg.value}
                          onChange={(e) => updateScriptArgument(index, 'value', e.target.value)}
                          className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary outline-none placeholder:text-ods-text-secondary"
                          placeholder="Enter Value (empty=flag)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={addScriptArgument}
                  variant="ghost"
                  className="flex items-center gap-2 text-ods-text-primary hover:text-ods-accent transition-colors py-3 px-0 font-['DM_Sans:Bold',_sans-serif] font-bold text-lg justify-start"
                  leftIcon={<Plus className="w-6 h-6" />}
                >
                  Add Script Argument
                </Button>
              </div>
            </div>

            {/* Environment Variables */}
            <div className="flex-1">
              <div className="space-y-2">
                <div className="space-y-2">
                  <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">Environment Vars</label>
                  {scriptData.env_vars.map((envVar, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1 bg-ods-card rounded-md border border-ods-border p-3">
                        <input
                          type="text"
                          value={envVar.name}
                          onChange={(e) => updateEnvironmentVar(index, 'name', e.target.value)}
                          className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary outline-none placeholder:text-ods-text-secondary"
                          placeholder="Enter Environment Var"
                        />
                      </div>
                      <div className="flex-1 bg-ods-card rounded-md border border-ods-border p-3">
                        <input
                          type="text"
                          value={envVar.value}
                          onChange={(e) => updateEnvironmentVar(index, 'value', e.target.value)}
                          className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary outline-none placeholder:text-ods-text-secondary"
                          placeholder="Enter Value"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={addEnvironmentVar}
                  variant="ghost"
                  className="flex items-center gap-2 text-ods-text-primary hover:text-ods-accent transition-colors py-3 px-0 font-['DM_Sans:Bold',_sans-serif] font-bold text-lg justify-start"
                  leftIcon={<Plus className="w-6 h-6" />}
                >
                  Add Environment Vars
                </Button>
              </div>
            </div>
          </div>

          {/* Syntax/Script Content */}
          <div className="space-y-1">
            <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">Syntax</label>
            <div className="bg-ods-bg rounded-md border border-ods-border relative">
              <div className="flex">
                <div className="w-12 bg-ods-bg py-3 px-2 overflow-hidden">
                  <div className="text-right text-ods-text-secondary text-lg font-['DM_Sans:Medium',_sans-serif] font-medium leading-6">
                    {scriptData.content.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 relative">
                  <textarea
                    value={scriptData.content}
                    onChange={(e) => setScriptData(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary outline-none p-3 resize-none font-mono leading-6 min-h-[600px]"
                    placeholder="#!/bin/bash\n\n# Your script content here..."
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          </div>

      </div>
    </FormPageContainer>
  )
}