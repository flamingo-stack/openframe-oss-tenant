'use client';

import { ScriptArguments } from '@flamingo-stack/openframe-frontend-core';
import { Button, CheckboxBlock, Input, Label } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLazyLoadQuery, useMutation } from 'react-relay';
import { z } from 'zod';
import type { batchRunScriptMutation as BatchRunScriptMutationType } from '@/__generated__/batchRunScriptMutation.graphql';
import type { scriptDetailRelayQuery as ScriptDetailQueryType } from '@/__generated__/scriptDetailRelayQuery.graphql';
import { scriptArgumentSchema } from '@/app/(app)/scripts/types/edit-script.types';
import { parseKeyValues, serializeKeyValues } from '@/app/(app)/scripts/utils/script-key-values';
import { ScriptSummaryCard } from '@/app/(app)/scripts/v2/components/script-summary-card';
import { initiatorName } from '@/app/(app)/scripts/v2/utils/execution-helpers';
import { envVarsToInput, envVarsToPairs, platformsToIds, shellToId } from '@/app/(app)/scripts/v2/utils/script-mappers';
import { batchRunScriptMutation } from '@/graphql/scripts/batch-run-script-mutation';
import { scriptDetailRelayQuery } from '@/graphql/scripts/script-detail-relay';

const runFormSchema = z.object({
  timeout: z.number().min(1, 'Timeout must be at least 1 second').max(86400, 'Timeout cannot exceed 24 hours'),
  runAsUser: z.boolean(),
  scriptArgs: z.array(scriptArgumentSchema),
  envVars: z.array(scriptArgumentSchema),
});

type RunFormData = z.infer<typeof runFormSchema>;

interface RunScriptConfigStepProps {
  scriptId: string;
  machineId: string;
  onBack: () => void;
  /** Script dispatched — advance to the "Scripts Running" confirmation. */
  onRan: () => void;
}

/**
 * Step 2 of the run-script modal — a mini "run script" view for a single device.
 * Shows the selected script's details and lets the user override the per-run
 * variables (timeout, privilege, arguments, env vars) before dispatching a
 * `batchRunScript` to this one machine. Suspends on the detail query; render
 * inside a `<Suspense>`.
 */
export function RunScriptConfigStep({ scriptId, machineId, onBack, onRan }: RunScriptConfigStepProps) {
  const { toast } = useToast();
  const data = useLazyLoadQuery<ScriptDetailQueryType>(
    scriptDetailRelayQuery,
    { id: scriptId },
    { fetchPolicy: 'store-and-network' },
  );
  const script = data.script;
  const [commitBatchRun, isRunning] = useMutation<BatchRunScriptMutationType>(batchRunScriptMutation);

  const { control, handleSubmit, reset } = useForm<RunFormData>({
    resolver: zodResolver(runFormSchema),
    defaultValues: { timeout: 90, runAsUser: false, scriptArgs: [], envVars: [] },
  });

  // Seed the overridable fields from the script's saved defaults once it loads.
  // Show one empty row when there are none so the inputs are visible; empty rows
  // are dropped on submit.
  useEffect(() => {
    if (!script) return;
    const parsedArgs = parseKeyValues(script.defaultArgs ? [...script.defaultArgs] : [], ' ');
    const parsedEnv = envVarsToPairs(script.envVars);
    reset({
      timeout: script.defaultTimeoutSeconds ?? 90,
      runAsUser: script.privilegeLevel === 'USER',
      scriptArgs: parsedArgs.length > 0 ? parsedArgs : [{ id: 'arg-0', key: '', value: '' }],
      envVars: parsedEnv.length > 0 ? parsedEnv : [{ id: 'env-0', key: '', value: '' }],
    });
  }, [script, reset]);

  const onValid = (formData: RunFormData) => {
    commitBatchRun({
      variables: {
        input: {
          machineIds: [machineId],
          scriptId,
          privilegeLevel: formData.runAsUser ? 'USER' : 'ADMIN',
          args: serializeKeyValues(formData.scriptArgs, ' '),
          timeoutSeconds: formData.timeout,
          envVars: envVarsToInput(formData.envVars),
        },
      },
      onCompleted: () => onRan(),
      onError: err => {
        toast({
          title: 'Run failed',
          description: err instanceof Error ? err.message : 'Failed to dispatch script',
          variant: 'destructive',
        });
      },
    });
  };

  const onInvalid = (errors: Record<string, { message?: string }>) => {
    const firstError = Object.values(errors)[0];
    if (firstError?.message) {
      toast({ title: 'Validation error', description: firstError.message, variant: 'destructive' });
    }
  };

  if (!script) {
    return <p className="text-ods-text-secondary text-h6">Script not found.</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[var(--spacing-system-l)]">
      <div className="min-h-0 flex-1 space-y-[var(--spacing-system-l)] overflow-y-auto">
        <ScriptSummaryCard
          name={script.name}
          description={script.description}
          shellId={shellToId(script.shell)}
          platforms={platformsToIds(script.supportedPlatforms)}
          author={script.author ? initiatorName(script.author) : null}
          showTimeout={false}
        />

        <div className="grid grid-cols-1 items-end gap-[var(--spacing-system-l)] lg:grid-cols-2">
          <div>
            <Label className="text-ods-text-primary text-h4">Timeout</Label>
            <Controller
              name="timeout"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  className="w-full"
                  value={field.value}
                  onChange={e => field.onChange(Number(e.target.value) || 0)}
                  endAdornment={<span className="text-ods-text-secondary text-h6">Seconds</span>}
                />
              )}
            />
          </div>

          <Controller
            name="runAsUser"
            control={control}
            render={({ field }) => (
              <CheckboxBlock
                checked={field.value}
                onCheckedChange={checked => field.onChange(checked === true)}
                label="Run as User"
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-[var(--spacing-system-l)]">
          <Controller
            name="scriptArgs"
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
            name="envVars"
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
      </div>

      <div className="flex shrink-0 gap-[var(--spacing-system-mf)] border-t border-ods-border pt-[var(--spacing-system-mf)]">
        <Button variant="outline" onClick={onBack} disabled={isRunning} className="flex-1">
          Back
        </Button>
        <Button
          variant="accent"
          onClick={handleSubmit(onValid, onInvalid)}
          disabled={isRunning}
          loading={isRunning}
          className="flex-1"
        >
          {isRunning ? 'Running...' : 'Run Script'}
        </Button>
      </div>
    </div>
  );
}
