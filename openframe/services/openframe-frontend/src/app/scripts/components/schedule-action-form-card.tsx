'use client';

import {
  OS_PLATFORMS,
  ScriptArguments,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@flamingo-stack/openframe-frontend-core';
import { TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, Input, Label } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { ScriptEntry } from '../stores/scripts-store';
import type { CreateScheduleFormData } from '../types/script-schedule.types';

interface ScheduleActionFormCardProps {
  index: number;
  scripts: ScriptEntry[];
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

export function ScheduleActionFormCard({ index, scripts, supportedPlatforms, onRemove }: ScheduleActionFormCardProps) {
  const { control, setValue, watch } = useFormContext<CreateScheduleFormData>();
  const selectedScriptId = watch(`actions.${index}.script`);

  const filteredScripts = useMemo(
    () =>
      scripts.filter(
        s => s.id === selectedScriptId || s.supported_platforms?.some(p => supportedPlatforms.includes(p)),
      ),
    [scripts, supportedPlatforms, selectedScriptId],
  );

  const handleScriptChange = (scriptId: number) => {
    const script = scripts.find(s => s.id === scriptId);
    if (script) {
      setValue(`actions.${index}.script`, script.id);
      setValue(`actions.${index}.name`, script.name);
      setValue(`actions.${index}.timeout`, script.default_timeout || 90);
    }
  };

  return (
    <div className="border border-ods-border rounded-[6px] p-4 flex flex-col gap-4">
      {/* Mobile: Select + Trash row */}
      <div className="flex md:hidden gap-2 items-end">
        <div className="flex-1 flex flex-col gap-1">
          <Controller
            name={`actions.${index}.script`}
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ''}
                onValueChange={val => handleScriptChange(Number(val))}
              >
                <SelectTrigger className="w-full bg-ods-card border border-ods-border">
                  <SelectValue placeholder="Select a script..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredScripts.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      <span className="inline-flex items-center">
                        {s.name}
                        <ScriptPlatformIcons platforms={s.supported_platforms} />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
        <div className="flex flex-col gap-1">
          <Label className="text-ods-text-secondary font-medium text-[14px]">Select Script</Label>
          <Controller
            name={`actions.${index}.script`}
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ''}
                onValueChange={val => handleScriptChange(Number(val))}
              >
                <SelectTrigger className="w-full bg-ods-card border border-ods-border">
                  <SelectValue placeholder="Select a script..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredScripts.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      <span className="inline-flex items-center">
                        {s.name}
                        <ScriptPlatformIcons platforms={s.supported_platforms} />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
