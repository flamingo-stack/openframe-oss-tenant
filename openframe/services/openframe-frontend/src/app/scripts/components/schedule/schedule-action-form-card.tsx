'use client';

import { OS_PLATFORMS, ScriptArguments } from '@flamingo-stack/openframe-frontend-core';
import { TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Autocomplete, Button, Input, Label } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { type FocusEvent, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useScriptsAutocomplete } from '../../hooks/use-scripts-autocomplete';
import type { CreateScheduleFormData } from '../../types/script-schedule.types';

interface ScheduleActionFormCardProps {
  index: number;
  supportedPlatforms: string[];
  onRemove: () => void;
}

function ScriptPlatformIcons({ platforms }: { platforms: string[] }) {
  return (
    <span className="inline-flex gap-0.5 ml-1.5">
      {OS_PLATFORMS.filter(p => platforms?.includes(p.id)).map(p => (
        <p.icon key={p.id} className="w-3.5 h-3.5 text-ods-text-secondary opacity-60" />
      ))}
    </span>
  );
}

export function ScheduleActionFormCard({ index, supportedPlatforms, onRemove }: ScheduleActionFormCardProps) {
  const { control, setValue, watch } = useFormContext<CreateScheduleFormData>();
  const selectedScriptId = watch(`actions.${index}.script`);

  const { scripts, isLoading, inputValue, onInputChange, onOpen, onClose, onClear } = useScriptsAutocomplete(
    supportedPlatforms,
    selectedScriptId || undefined,
  );

  // Fires only when focus leaves the entire autocomplete widget (not on internal focus moves)
  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) onClose();
  };

  const scriptOptions = useMemo(() => scripts.map(s => ({ label: s.name, value: s.id })), [scripts]);

  const handleScriptChange = (scriptId: number | null) => {
    if (!scriptId) {
      onClear();
      return;
    }
    const script = scripts.find(s => s.id === scriptId);
    if (script) {
      setValue(`actions.${index}.script`, script.id);
      setValue(`actions.${index}.name`, script.name);
      setValue(`actions.${index}.timeout`, script.default_timeout || 90);
    }
  };

  const autocompleteProps = {
    options: scriptOptions,
    value: selectedScriptId || null,
    onChange: handleScriptChange,
    placeholder: 'Select a script...',
    filterOptions: () => scriptOptions,
    onInputChange,
    loading: isLoading,
    loadingText: 'Searching scripts...',
    noOptionsText: inputValue ? 'No scripts match your search' : 'No scripts available',
    renderOption: (option: { label: string; value: number }) => (
      <span className="inline-flex items-center">
        {option.label}
        <ScriptPlatformIcons platforms={scripts.find(s => s.id === option.value)?.supported_platforms || []} />
      </span>
    ),
  } as const;

  return (
    <div className="border border-ods-border rounded-[6px] p-4 flex flex-col gap-4">
      {/* Mobile: Select + Trash row */}
      <div className="flex md:hidden gap-2 items-end">
        <div className="flex-1 flex flex-col gap-1" onFocus={onOpen} onBlur={handleBlur}>
          <Controller
            name={`actions.${index}.script`}
            control={control}
            render={() => <Autocomplete<number> {...autocompleteProps} />}
          />
        </div>
        <Button variant="card" size="icon" onClick={onRemove} className="text-[var(--ods-attention-red-error,#f36666)]">
          <TrashIcon size={20} />
        </Button>
      </div>

      {/* Mobile: Timeout full width */}
      <div className="flex md:hidden flex-col gap-1">
        <Label className="text-ods-text-secondary font-medium text-[14px]">Timeout</Label>
        <Controller
          name={`actions.${index}.timeout`}
          control={control}
          render={({ field }) => (
            <Input
              type="number"
              className="w-full"
              value={field.value}
              onChange={e => field.onChange(Number(e.target.value) || 0)}
              endAdornment={<span className="text-ods-text-secondary text-sm">Seconds</span>}
            />
          )}
        />
      </div>

      {/* Tablet+: Select + Timeout + Trash in one row */}
      <div className="hidden md:grid md:grid-cols-[1fr_auto_auto] gap-4 items-end">
        <div className="flex flex-col gap-1" onFocus={onOpen} onBlur={handleBlur}>
          <Label className="text-ods-text-secondary font-medium text-[14px]">Select Script</Label>
          <Controller
            name={`actions.${index}.script`}
            control={control}
            render={() => <Autocomplete<number> {...autocompleteProps} />}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-ods-text-secondary font-medium text-[14px]">Timeout</Label>
          <Controller
            name={`actions.${index}.timeout`}
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                className="w-[160px]"
                value={field.value}
                onChange={e => field.onChange(Number(e.target.value) || 0)}
                endAdornment={<span className="text-ods-text-secondary text-sm">Seconds</span>}
              />
            )}
          />
        </div>

        <Button variant="card" size="icon" onClick={onRemove} className="text-[var(--ods-attention-red-error,#f36666)]">
          <TrashIcon size={20} />
        </Button>
      </div>

      {/* Script Arguments & Env Vars */}
      {selectedScriptId > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name={`actions.${index}.script_args`}
            control={control}
            render={({ field }) => (
              <ScriptArguments
                arguments={field.value}
                onArgumentsChange={field.onChange}
                keyPlaceholder="Key"
                valuePlaceholder="Enter Value (empty=flag)"
                addButtonLabel="Add Script Argument"
                titleLabel="Script Arguments"
              />
            )}
          />
          <Controller
            name={`actions.${index}.env_vars`}
            control={control}
            render={({ field }) => (
              <ScriptArguments
                arguments={field.value}
                onArgumentsChange={field.onChange}
                keyPlaceholder="Key"
                valuePlaceholder="Enter Value"
                addButtonLabel="Add Environment Var"
                titleLabel="Environment Vars"
              />
            )}
          />
        </div>
      )}
    </div>
  );
}
