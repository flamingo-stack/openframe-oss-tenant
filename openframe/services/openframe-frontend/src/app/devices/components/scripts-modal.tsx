'use client'

import React, { useState, useEffect } from 'react'
import { X, Search, Check } from 'lucide-react'
import { Button } from '@flamingo/ui-kit'
import { useToast } from '@flamingo/ui-kit/hooks'
import { getOSPlatformId, OS_TYPES } from '@flamingo/ui-kit'
import { useScripts } from '../../scripts/hooks/use-scripts'
import { ScriptEntry } from '../../scripts/stores/scripts-store'
import { Device } from '../types/device.types'
import { tacticalApiClient } from '../../../lib/tactical-api-client'
import { ListLoader, PageError } from '@flamingo/ui-kit/components/ui'

const scrollbarStyles = {
  scrollbarWidth: 'thin' as const,
  scrollbarColor: 'var(--color-text-secondary) var(--color-border-default)'
}

interface ScriptsModalProps {
  isOpen: boolean
  onClose: () => void
  deviceId: string
  device: Partial<Device> | null
  onRunScripts: (scriptIds: string[]) => void
  onDeviceLogs?: () => void
}

const getCategoriesFromScripts = (scripts: ScriptEntry[]): string[] => {
  const categories = scripts.reduce((acc, script) => {
    if (script.category && !acc.includes(script.category.toUpperCase())) {
      acc.push(script.category.toUpperCase())
    }
    return acc
  }, [] as string[])
  return categories.sort().slice(0, 3)
}

// Filter scripts based on device platform compatibility
// Uses centralized OS type system from ui-kit
const filterScriptsByPlatform = (scripts: ScriptEntry[], devicePlatform: string): ScriptEntry[] => {
  if (!devicePlatform) return scripts

  // Get the normalized platform ID using centralized OS types
  const platformId = getOSPlatformId(devicePlatform)
  if (!platformId) return scripts

  // Get all aliases for this platform from centralized OS_TYPES
  const osTypeDef = OS_TYPES.find(os => os.platformId === platformId)
  const compatiblePlatforms = osTypeDef ? osTypeDef.aliases : []

  return scripts.filter(script => {
    if (!script.supported_platforms || script.supported_platforms.length === 0) {
      return true
    }

    return script.supported_platforms.some(platform =>
      compatiblePlatforms.some(compatiblePlatform =>
        platform.toLowerCase().includes(compatiblePlatform) ||
        compatiblePlatform.includes(platform.toLowerCase())
      )
    )
  })
}

interface CheckboxProps {
  active?: boolean
  state?: 'default' | 'hover' | 'action'
}

function CustomCheckbox({ active = true, state = 'default' }: CheckboxProps) {
  if (!active) {
    return (
      <div className="relative w-6 h-6">
        <div className="absolute bg-ods-card inset-0 rounded-[6px]">
          <div className="absolute border-2 border-ods-border inset-0 rounded-[6px]" />
        </div>
      </div>
    )
  }
  return (
    <div className="relative w-6 h-6">
      <div className="absolute bg-ods-accent inset-0 rounded-[6px]" />
      <div className="absolute inset-[29.17%] flex items-center justify-center">
        <Check className="h-3 w-3 text-black" />
      </div>
    </div>
  )
}

export function ScriptsModal({ isOpen, onClose, deviceId, device, onRunScripts, onDeviceLogs }: ScriptsModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedScripts, setSelectedScripts] = useState<string[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const { scripts, isLoading, error, fetchScripts } = useScripts()
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && scripts.length === 0) {
      fetchScripts('', {})
    }
  }, [isOpen, scripts.length, fetchScripts])

  const platformCompatibleScripts = device 
    ? filterScriptsByPlatform(scripts, device.plat || '')
    : scripts

  const categories = getCategoriesFromScripts(platformCompatibleScripts)

  const filteredScripts = platformCompatibleScripts.filter(script => {
    const matchesSearch = script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         script.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || script.category.toUpperCase() === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleScriptToggle = (scriptId: number) => {
    const scriptIdStr = scriptId.toString()
    setSelectedScripts(prev => 
      prev.includes(scriptIdStr) 
        ? prev.filter(id => id !== scriptIdStr)
        : [...prev, scriptIdStr]
    )
  }

  const handleSelectAll = () => {
    if (selectedScripts.length === filteredScripts.length) {
      setSelectedScripts([])
    } else {
      setSelectedScripts(filteredScripts.map(script => script.id.toString()))
    }
  }

  const handleRunScripts = async () => {
    if (selectedScripts.length === 0) {
      toast({
        title: 'No scripts selected',
        description: 'Please select at least one script to run.',
        variant: 'destructive'
      })
      return
    }

    setIsExecuting(true)

    try {
      const executionPromises = selectedScripts.map(async (scriptId) => {
        try {
          const response = await tacticalApiClient.runScript(deviceId, {
            output: "forget",
            emails: [],
            emailMode: "default",
            custom_field: null,
            save_all_output: false,
            script: parseInt(scriptId),
            args: [],
            env_vars: [],
            timeout: 120,
            run_as_user: false,
            run_on_server: false
          })

          if (!response.ok) {
            throw new Error(response.error || `Failed to execute script ${scriptId}`)
          }

          console.log(`Script ${scriptId} execution initiated:`, response)
          return { scriptId, success: true }
        } catch (error) {
          console.error(`Script ${scriptId} execution failed:`, error)
          return { scriptId, success: false }
        }
      })

      Promise.all(executionPromises).then((results) => {
        const successes = results.filter(result => result.success).length
        const failures = results.filter(result => !result.success).length

        if (failures === 0) {
          toast({
            title: 'Scripts submitted successfully',
            description: `${successes} script${successes > 1 ? 's' : ''} submitted for execution. Check device logs for results.`,
            variant: 'default'
          })
        } else if (successes > 0) {
          toast({
            title: 'Partial submission success',
            description: `${successes} script${successes > 1 ? 's' : ''} submitted successfully, ${failures} failed to submit.`,
            variant: 'destructive'
          })
        } else {
          toast({
            title: 'Script submission failed',
            description: `Failed to submit ${failures} script${failures > 1 ? 's' : ''}.`,
            variant: 'destructive'
          })
        }
      })

      onRunScripts(selectedScripts)

      // Show loading state and wait 3 seconds before redirecting
      setIsRedirecting(true)

      setTimeout(() => {
        // Redirect to logs tab and close modal
        if (onDeviceLogs) {
          onDeviceLogs()
        }
        onClose()
        setIsRedirecting(false)
      }, 3000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit scripts'
      console.error('Script submission error:', error)

      toast({
        title: 'Script submission failed',
        description: errorMessage,
        variant: 'destructive'
      })

      // Reset states on error
      setIsRedirecting(false)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category)
  }

  const handleShowAll = () => {
    setSelectedCategory(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full max-w-[600px] h-[90vh] max-h-[800px] flex flex-col p-10 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-['Azeret_Mono'] font-semibold text-[32px] text-ods-text-primary tracking-[-0.64px] leading-[40px]">
            {isRedirecting ? 'Scripts Running' : 'Select Script'}
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-ods-text-secondary hover:text-white transition-colors p-1"
            disabled={isRedirecting}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {isRedirecting ? (
          /* Loading State with Skeletons */
          <>
            {/* Search Input Skeleton */}
            <div className="flex flex-col gap-1">
              <div className="bg-ods-card border border-ods-border rounded-[6px] h-[52px] animate-pulse"></div>
            </div>

            {/* Script List Skeleton */}
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <div className="bg-ods-card border border-ods-border rounded-[6px] flex-1 min-h-0 p-4">
                <ListLoader />
              </div>
            </div>

            {/* Footer Skeleton */}
            <div className="flex gap-6">
              <div className="flex-1 bg-ods-card border border-ods-border rounded-[6px] h-[48px] animate-pulse"></div>
              <div className="flex-1 bg-ods-accent/20 rounded-[6px] h-[48px] animate-pulse"></div>
            </div>

            {/* Redirecting Message */}
            <div className="text-center">
              <p className="font-['DM_Sans'] text-[16px] text-ods-text-secondary leading-[20px]">
                Redirecting to device logs...
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Search Input */}
            <div className="flex flex-col gap-1">
          <div className="bg-ods-card border border-ods-border rounded-[6px] flex items-center gap-2 p-3">
            <Search className="h-6 w-6 text-ods-text-secondary" />
            <input
              type="text"
              placeholder="Search for Script"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-ods-text-secondary font-['DM_Sans'] font-medium text-[18px] leading-[24px] flex-1 placeholder-ods-text-secondary focus:outline-none"
            />
          </div>
          
          {/* Category Filters */}
          <div className="flex items-center gap-1">
            <div className="flex flex-wrap gap-1 flex-1">
              {categories.map(category => (
                <Button
                  key={category}
                  onClick={() => handleCategoryFilter(category)}
                  variant="outline"
                  className="bg-ods-card border border-ods-border rounded-[6px] px-2 py-2 h-8 flex items-center justify-center"
                >
                  <span className="font-['Azeret_Mono'] font-medium text-[14px] text-ods-text-primary tracking-[-0.28px] leading-[20px] uppercase">
                    {category}
                  </span>
                </Button>
              ))}
            </div>
            <Button
              onClick={handleShowAll}
              variant="link"
              className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-secondary underline leading-[20px] ml-2 p-0 h-auto"
            >
              Show All
            </Button>
          </div>
        </div>

        {/* Script List */}
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex justify-end">
            <Button
              onClick={handleSelectAll}
              variant="link"
              className="font-['DM_Sans'] font-medium text-[14px] text-ods-accent underline leading-[20px] p-0 h-auto"
            >
              Select All
            </Button>
          </div>

          <div className="bg-ods-card border border-ods-border rounded-[6px] flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-ods-border scrollbar-track-transparent">
              {isLoading ? (
                <div className="py-8">
                  <ListLoader />
                </div>
              ) : error ? (
                <div className="py-4">
                  <PageError message={`Error loading scripts: ${error}`} />
                </div>
              ) : filteredScripts.length === 0 ? (
                <div className="text-center text-ods-text-secondary py-8">
                  No scripts found matching your criteria
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredScripts.map((script, index) => {
                    const isSelected = selectedScripts.includes(script.id.toString())
                    return (
                      <div
                        key={script.id}
                        onClick={() => handleScriptToggle(script.id)}
                        className={`flex gap-4 items-center justify-start px-4 py-3 cursor-pointer border-b border-ods-border ${
                          isSelected ? 'bg-accent-active' : 'bg-ods-bg'
                        } ${index === filteredScripts.length - 1 ? 'border-b-0' : ''}`}
                      >
                        <div className="flex flex-col flex-1">
                          <div className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary leading-[24px] mb-1">
                            {script.name}
                          </div>
                          <div className={`font-['DM_Sans'] font-medium text-[14px] leading-[20px] ${
                            isSelected ? 'text-ods-accent' : 'text-ods-text-secondary'
                          }`}>
                            {script.description}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <CustomCheckbox active={isSelected} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Footer */}
        <div className="flex gap-6">
          <Button
            onClick={onClose}
            className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRunScripts}
            disabled={selectedScripts.length === 0}
            className="flex-1 bg-ods-accent text-text-on-accent font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ods-accent-hover transition-colors"
          >
            Run Script{selectedScripts.length !== 1 ? 's' : ''}
          </Button>
        </div>
          </>
        )}
      </div>
    </div>
  )
}