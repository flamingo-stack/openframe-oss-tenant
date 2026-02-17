import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { tacticalApiClient } from '@lib/tactical-api-client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect } from 'react'
import { type FieldErrors, useForm } from 'react-hook-form'

import type { ScriptDetails } from './use-script-details'
import { editScriptSchema, EDIT_SCRIPT_DEFAULT_VALUES, type EditScriptFormData } from '../types/edit-script.types'

interface UseEditScriptFormOptions {
  scriptId: string | null
  scriptDetails: ScriptDetails | null
  isEditMode: boolean
}

export function useEditScriptForm({ scriptId, scriptDetails, isEditMode }: UseEditScriptFormOptions) {
  const { toast } = useToast()

  const form = useForm<EditScriptFormData>({
    resolver: zodResolver(editScriptSchema),
    defaultValues: EDIT_SCRIPT_DEFAULT_VALUES,
  })

  const { reset, handleSubmit, formState: { isSubmitting } } = form

  useEffect(() => {
    if (scriptDetails && isEditMode) {
      reset({
        name: scriptDetails.name,
        shell: scriptDetails.shell,
        default_timeout: scriptDetails.default_timeout,
        args: scriptDetails.args?.map((arg: string, i: number) => {
          const [key, ...rest] = arg.includes('=') ? arg.split('=') : [arg]
          return { id: String(i), key: key || '', value: rest.join('=') || '' }
        }) || [],
        script_body: scriptDetails.script_body || '',
        run_as_user: scriptDetails.run_as_user,
        env_vars: scriptDetails.env_vars?.map((envVar: string, i: number) => {
          const [name, ...rest] = envVar.split('=')
          return { id: String(i), key: name || '', value: rest.join('=') || '' }
        }) || [],
        description: scriptDetails.description,
        supported_platforms: scriptDetails.supported_platforms || [],
        category: scriptDetails.category,
      })
    }
  }, [scriptDetails, isEditMode, reset])

  const onSubmit = useCallback(async (data: EditScriptFormData) => {
    try {
      const filteredArgs = data.args.filter(arg => arg.key.trim() !== '')
      const filteredEnvVars = data.env_vars.filter(envVar => envVar.key.trim() !== '')

      const payload = {
        name: data.name,
        shell: data.shell,
        default_timeout: data.default_timeout,
        args: filteredArgs.map(arg => arg.value ? `${arg.key}=${arg.value}` : arg.key),
        script_body: data.script_body,
        run_as_user: data.run_as_user,
        env_vars: filteredEnvVars.map(envVar => `${envVar.key}=${envVar.value}`),
        description: data.description,
        supported_platforms: data.supported_platforms,
        category: data.category,
      }

      if (isEditMode && scriptId) {
        const response = await tacticalApiClient.updateScript(scriptId, payload)
        if (!response.ok) {
          throw new Error(String(response.data) || response.error || 'Failed to update script')
        }
        toast({ title: 'Success', description: 'Script updated successfully', variant: 'success' })
      } else {
        const response = await tacticalApiClient.createScript(payload)
        if (!response.ok) {
          throw new Error(response.error || 'Failed to create script')
        }
        toast({ title: 'Success', description: 'Script created successfully', variant: 'success' })
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save script',
        variant: 'destructive'
      })
    }
  }, [isEditMode, scriptId, toast])

  const onValidationError = useCallback((errors: FieldErrors<EditScriptFormData>) => {
    const messages = Object.values(errors)
      .map(err => err?.message)
      .filter(Boolean)

    toast({
      title: 'Validation Error',
      description: messages.join(', '),
      variant: 'destructive'
    })
  }, [toast])

  const handleSave = useCallback(() => {
    handleSubmit(onSubmit, onValidationError)()
  }, [handleSubmit, onSubmit, onValidationError])

  return { form, isSubmitting, handleSave }
}
