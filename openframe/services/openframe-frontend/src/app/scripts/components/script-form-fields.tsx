'use client'

import { Label, ScriptArguments, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@flamingo-stack/openframe-frontend-core'
import { useMdUp } from '@flamingo-stack/openframe-frontend-core/hooks'
import { SelectButton } from '@flamingo-stack/openframe-frontend-core/components/features'
import { CheckboxBlock, Input, Textarea } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { SHELL_TYPES } from '@flamingo-stack/openframe-frontend-core/types'
import { Controller, type UseFormReturn } from 'react-hook-form'

import { CATEGORIES, type EditScriptFormData } from '../types/edit-script.types'
import { DISABLED_PLATFORMS, getAvailableOsPlatforms } from '../utils/script-utils'
import { ScriptEditor } from './script-editor'

interface ScriptFormFieldsProps {
  form: UseFormReturn<EditScriptFormData>
}

export function ScriptFormFields({ form }: ScriptFormFieldsProps) {
  const { control, watch, setValue, getValues } = form
  const watchedSupportedPlatforms = watch('supported_platforms')
  const isMdUp = useMdUp()
  const platforms = getAvailableOsPlatforms()

  return (
    <>
      {/* Supported Platform Section */}
      <div>
        <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Supported Platform</Label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {platforms.map(p => {
            const isDisabled = DISABLED_PLATFORMS.includes(p.id)
            return (
              <SelectButton
                key={p.id}
                title={p.name}
                icon={<p.icon className="w-5 h-5" />}
                selected={!isDisabled && watchedSupportedPlatforms.includes(p.id)}
                disabled={isDisabled}
                tag={isDisabled ? (isMdUp ? 'Coming Soon' : 'Soon') : undefined}
                onClick={isDisabled ? undefined : () => {
                  const current = getValues('supported_platforms')
                  const has = current.includes(p.id)
                  setValue(
                    'supported_platforms',
                    has ? current.filter(id => id !== p.id) : [...current, p.id],
                    { shouldValidate: true }
                  )
                }}
              />
            )
          })}
          <Controller
            name="run_as_user"
            control={control}
            render={({ field }) => (
              <CheckboxBlock
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked)}
                label="Run as User"
                description="Windows Only"
                className="col-span-2 lg:col-span-1"
              />
            )}
          />
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <div className="space-y-1">
              <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Name</Label>
              <Input
                type="text"
                value={field.value}
                onChange={field.onChange}
                placeholder="Enter Script Name Here"
              />
            </div>
          )}
        />

        <Controller
          name="shell"
          control={control}
          render={({ field }) => (
            <div className="space-y-1">
              <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Shell Type</Label>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full bg-ods-card border border-ods-border px-3 py-3 font-['DM_Sans'] font-medium text-ods-text-primary hover:bg-ods-bg-hover focus:ring-0 rounded-md">
                  <SelectValue placeholder="Select Shell Type" />
                </SelectTrigger>
                <SelectContent>
                  {SHELL_TYPES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <s.icon className="w-5 h-5" />
                        <span>{s.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <div className="space-y-1">
              <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Category</Label>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full bg-ods-card border border-ods-border px-3 py-3 font-['DM_Sans'] font-medium text-ods-text-primary hover:bg-ods-bg-hover focus:ring-0 rounded-md">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="default_timeout"
          control={control}
          render={({ field }) => (
            <div className="space-y-1">
              <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Timeout</Label>
              <Input
                type="number"
                value={field.value}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 90)}
                placeholder="90"
                endAdornment={<span className="text-sm text-ods-text-secondary">Seconds</span>}
              />
            </div>
          )}
        />
      </div>

      {/* Description */}
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <div>
            <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Description</Label>
            <Textarea
              value={field.value}
              onChange={field.onChange}
              rows={4}
              placeholder="Enter Script Description"
            />
          </div>
        )}
      />

      {/* Script Arguments and Environment Variables */}
      <div className="flex flex-col lg:flex-row gap-6">
        <Controller
          name="args"
          control={control}
          render={({ field }) => (
            <ScriptArguments
              arguments={field.value}
              onArgumentsChange={field.onChange}
              keyPlaceholder="Enter Argument"
              valuePlaceholder="Enter Value (empty=flag)"
              addButtonLabel="Add Script Argument"
              titleLabel="Script Arguments"
              className="flex-1"
            />
          )}
        />
        <Controller
          name="env_vars"
          control={control}
          render={({ field }) => (
            <ScriptArguments
              arguments={field.value}
              onArgumentsChange={field.onChange}
              keyPlaceholder="Enter Environment Var"
              valuePlaceholder="Enter Value"
              addButtonLabel="Add Environment Var"
              titleLabel="Environment Vars"
              className="flex-1"
            />
          )}
        />
      </div>

      {/* Syntax/Script Content */}
      <Controller
        name="script_body"
        control={control}
        render={({ field }) => (
          <div>
            <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Syntax</Label>
            <ScriptEditor
              value={field.value}
              onChange={field.onChange}
              shell={getValues('shell')}
              height="600px"
            />
          </div>
        )}
      />
    </>
  )
}
