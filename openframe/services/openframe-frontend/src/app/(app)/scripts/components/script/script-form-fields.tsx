'use client';

import {
  Label,
  ScriptArguments,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@flamingo-stack/openframe-frontend-core';
import { SelectButton } from '@flamingo-stack/openframe-frontend-core/components/features';
import { CheckboxBlock, Input, Textarea } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMdUp } from '@flamingo-stack/openframe-frontend-core/hooks';
import { SHELL_TYPES, type ShellTypeDefinition } from '@flamingo-stack/openframe-frontend-core/types';
import type { ReactNode } from 'react';
import { Controller, type UseFormReturn, useFormState } from 'react-hook-form';

import { CATEGORIES, type EditScriptFormData } from '../../types/edit-script.types';
import { AVAILABLE_PLATFORMS, DISABLED_PLATFORMS } from '../../utils/script-utils';
import { ScriptEditor } from './script-editor';

interface ScriptFormFieldsProps {
  form: UseFormReturn<EditScriptFormData>;
  /** Restrict the Shell Type options to these ids. Omit to show every SHELL_TYPES entry. */
  allowedShellIds?: string[];
  /**
   * Provide a custom Shell Type option list (label + icon). Takes precedence over
   * `allowedShellIds`. Scripts v2 passes its host-owned `SCRIPT_V2_SHELL_TYPES`.
   */
  shellTypes?: ShellTypeDefinition[];
  /** Hide the Category field (the native API has no such concept). */
  hideCategory?: boolean;
  /** Hide the "Run as User" toggle (not a stored script field on the native API). */
  hideRunAsUser?: boolean;
  /**
   * Optional tags picker rendered after the description. Passed by scripts v2
   * (owns the Relay tag fetching); legacy callers omit it.
   */
  tagsField?: ReactNode;
  /**
   * Disable every control (inputs, selects, platform cards, args, editor).
   * Used by the edit page while the script query is still loading, so the real
   * empty form doubles as the loading state — no skeleton swap, no remount.
   */
  disabled?: boolean;
  /**
   * Controls inline error visibility. The parent flips this true once the user
   * attempts an action (Save or Test) so errors stay hidden on a pristine form,
   * then track validation live. Which fields actually carry an error is decided
   * by the caller's `form.trigger` scope per action — Save validates everything,
   * Test only its runnable prerequisites. Defaults to true (always show) for
   * legacy callers that validate eagerly.
   */
  showErrors?: boolean;
}

export function ScriptFormFields({
  form,
  allowedShellIds,
  shellTypes: shellTypesProp,
  hideCategory,
  hideRunAsUser,
  tagsField,
  disabled = false,
  showErrors = true,
}: ScriptFormFieldsProps) {
  const { control, watch, setValue, getValues } = form;
  const watchedSupportedPlatforms = watch('supported_platforms');
  const isMdUp = useMdUp();
  // Subscribe to errors so the platform inline message tracks validation live.
  const { errors } = useFormState({ control });

  const shellTypes =
    shellTypesProp ?? (allowedShellIds ? SHELL_TYPES.filter(s => allowedShellIds.includes(s.value)) : SHELL_TYPES);

  return (
    <>
      {/* Supported Platform Section */}
      <div className="relative">
        <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Supported Platform</Label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-1">
          {AVAILABLE_PLATFORMS.map(p => {
            const isDisabled = DISABLED_PLATFORMS.includes(p.id);
            return (
              <SelectButton
                key={p.id}
                title={p.name}
                icon={<p.icon className="w-5 h-5" />}
                selected={!isDisabled && watchedSupportedPlatforms.includes(p.id)}
                disabled={isDisabled || disabled}
                tag={isDisabled ? (isMdUp ? 'Coming Soon' : 'Soon') : undefined}
                onClick={
                  isDisabled
                    ? undefined
                    : () => {
                        const current = getValues('supported_platforms');
                        const has = current.includes(p.id);
                        // Allow deselecting any item, including the last one — the
                        // "at least one platform" rule is enforced by validation on submit.
                        setValue('supported_platforms', has ? current.filter(id => id !== p.id) : [...current, p.id], {
                          shouldValidate: true,
                        });
                      }
                }
              />
            );
          })}
          {!hideRunAsUser && (
            <Controller
              name="run_as_user"
              control={control}
              render={({ field }) => (
                <CheckboxBlock
                  checked={field.value}
                  onCheckedChange={checked => field.onChange(checked)}
                  label="Run as User"
                  disabled={disabled}
                  // Match the SelectButton card height (h-11 md:h-16) — the block's
                  // own min-height is shorter, so override it on the inner label.
                  className="[&>label]:h-11 md:[&>label]:h-16 [&>label]:min-h-0"
                />
              )}
            />
          )}
        </div>
        {showErrors && errors.supported_platforms && (
          <p
            className="absolute bottom-0 left-0 right-0 translate-y-full truncate text-h6 text-ods-error"
            title={errors.supported_platforms.message}
          >
            {errors.supported_platforms.message}
          </p>
        )}
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-1">
              <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Name</Label>
              <Input
                type="text"
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                placeholder="Enter Script Name Here"
                error={showErrors ? fieldState.error?.message : undefined}
                invalid={showErrors && !!fieldState.error}
              />
            </div>
          )}
        />

        <Controller
          name="shell"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-1">
              <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Shell Type</Label>
              <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                <SelectTrigger
                  error={showErrors ? fieldState.error?.message : undefined}
                  invalid={showErrors && !!fieldState.error}
                >
                  <SelectValue placeholder="Select Shell Type" />
                </SelectTrigger>
                <SelectContent>
                  {shellTypes.map(s => (
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

        {!hideCategory && (
          <Controller
            name="category"
            control={control}
            render={({ field, fieldState }) => (
              <div className="space-y-1">
                <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Category</Label>
                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                  <SelectTrigger
                    error={showErrors ? fieldState.error?.message : undefined}
                    invalid={showErrors && !!fieldState.error}
                  >
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        )}

        <Controller
          name="default_timeout"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-1">
              <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Timeout</Label>
              <Input
                type="number"
                value={field.value}
                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : '')}
                disabled={disabled}
                placeholder="90"
                endAdornment={<span className="text-sm text-ods-text-secondary">Seconds</span>}
                error={showErrors ? fieldState.error?.message : undefined}
                invalid={showErrors && !!fieldState.error}
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
              disabled={disabled}
              placeholder="Enter Script Description"
            />
          </div>
        )}
      />

      {/* Tags */}
      {tagsField}

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
              disabled={disabled}
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
              disabled={disabled}
              className="flex-1"
            />
          )}
        />
      </div>

      {/* Syntax/Script Content */}
      <Controller
        name="script_body"
        control={control}
        render={({ field, fieldState }) => (
          <div>
            <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Syntax</Label>
            <ScriptEditor
              value={field.value}
              onChange={field.onChange}
              shell={getValues('shell')}
              readOnly={disabled}
              height="600px"
              invalid={showErrors && !!fieldState.error}
            />
            {showErrors && fieldState.error && (
              <p className="text-h6 text-ods-error truncate mt-1" title={fieldState.error.message}>
                {fieldState.error.message}
              </p>
            )}
          </div>
        )}
      />
    </>
  );
}
