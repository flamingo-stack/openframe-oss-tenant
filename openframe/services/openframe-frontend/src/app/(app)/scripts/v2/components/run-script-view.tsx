'use client';

import { NotFoundError, PageLayout, ScriptArguments } from '@flamingo-stack/openframe-frontend-core';
import { CheckboxBlock, Input, Label } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLazyLoadQuery, useMutation } from 'react-relay';
import { z } from 'zod';
import type { batchRunScriptMutation as BatchRunScriptMutationType } from '@/__generated__/batchRunScriptMutation.graphql';
import type { scriptDetailRelayQuery as ScriptDetailQueryType } from '@/__generated__/scriptDetailRelayQuery.graphql';
import { DeviceSelector } from '@/app/components/shared/device-selector';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { batchRunScriptMutation } from '@/graphql/scripts/batch-run-script-mutation';
import { scriptDetailRelayQuery } from '@/graphql/scripts/script-detail-relay';
import type { Device } from '../../../devices/types/device.types';
import { ExecutionStartedModal } from '../../components/script/execution-started-modal';
import { scriptArgumentSchema } from '../../types/edit-script.types';
import { getDevicePrimaryId } from '../../utils/device-helpers';
import { parseKeyValues, serializeKeyValues } from '../../utils/script-key-values';
import { useRunDevices } from '../hooks/use-run-devices';
import { initiatorName } from '../utils/execution-helpers';
import { envVarsToInput, envVarsToPairs, platformsToIds, shellToId } from '../utils/script-mappers';
import { RunScriptSkeleton } from './run-script-skeleton';
import { ScriptSummaryCard } from './script-summary-card';

interface RunScriptViewProps {
  scriptId: string;
}

const runFormSchema = z.object({
  timeout: z.number().min(1, 'Timeout must be at least 1 second').max(86400, 'Timeout cannot exceed 24 hours'),
  runAsUser: z.boolean(),
  scriptArgs: z.array(scriptArgumentSchema),
  envVars: z.array(scriptArgumentSchema),
});

type RunFormData = z.infer<typeof runFormSchema>;

function getMachineId(device: Device): string | undefined {
  return device.machineId || undefined;
}

function RunScriptContent({ scriptId }: RunScriptViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const data = useLazyLoadQuery<ScriptDetailQueryType>(
    scriptDetailRelayQuery,
    { id: scriptId },
    { fetchPolicy: 'store-and-network' },
  );
  const script = data.script;

  const supportedPlatforms = useMemo(() => platformsToIds(script?.supportedPlatforms), [script?.supportedPlatforms]);

  const { devices: allDevices, isLoadingDevices } = useRunDevices({
    scriptId,
    supportedPlatforms,
    enabled: Boolean(script),
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [commitBatchRun] = useMutation<BatchRunScriptMutationType>(batchRunScriptMutation);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<RunFormData>({
    resolver: zodResolver(runFormSchema),
    defaultValues: { timeout: 90, runAsUser: false, scriptArgs: [], envVars: [] },
  });

  useEffect(() => {
    if (script) {
      const parsedArgs = parseKeyValues(script.defaultArgs ? [...script.defaultArgs] : [], ' ');
      const parsedEnv = envVarsToPairs(script.envVars);
      reset({
        timeout: script.defaultTimeoutSeconds ?? 90,
        // Seed from the script's saved privilege; the user can still toggle it per run.
        runAsUser: script.privilegeLevel === 'USER',
        // Show one empty row when the script has none, so the inputs are visible.
        // Empty rows are dropped on submit, so the run still starts without them.
        scriptArgs: parsedArgs.length > 0 ? parsedArgs : [{ id: 'arg-0', key: '', value: '' }],
        envVars: parsedEnv.length > 0 ? parsedEnv : [{ id: 'env-0', key: '', value: '' }],
      });
    }
  }, [script, reset]);

  const handleBack = useSafeBack(`/scripts-v2/details/${scriptId}`);

  // One dispatch to every selected machine under a single shared executionId
  // (batchRunScript), instead of a runScript per device.
  const dispatchBatch = useCallback(
    (
      machineIds: string[],
      args: string[],
      timeoutSeconds: number,
      envVars: ReturnType<typeof envVarsToInput>,
      runAsUser: boolean,
    ) =>
      new Promise<void>((resolve, reject) => {
        commitBatchRun({
          variables: {
            input: {
              machineIds,
              scriptId,
              privilegeLevel: runAsUser ? 'USER' : 'ADMIN',
              args,
              timeoutSeconds,
              envVars,
            },
          },
          onCompleted: () => resolve(),
          onError: err => reject(err),
        });
      }),
    [commitBatchRun, scriptId],
  );

  const onSubmit = useCallback(
    async (formData: RunFormData) => {
      if (selectedIds.size === 0) {
        toast({
          title: 'No devices selected',
          description: 'Please select at least one device.',
          variant: 'destructive',
        });
        return;
      }

      const selectedDevices = allDevices.filter(d => selectedIds.has(getDevicePrimaryId(d)));
      const machineIds = selectedDevices.map(getMachineId).filter((id): id is string => !!id);

      if (machineIds.length === 0) {
        toast({
          title: 'No compatible devices',
          description: 'Selected devices have no machine ID.',
          variant: 'destructive',
        });
        return;
      }

      const args = serializeKeyValues(formData.scriptArgs, ' ');
      const envVars = envVarsToInput(formData.envVars);

      try {
        await dispatchBatch(machineIds, args, formData.timeout, envVars, formData.runAsUser);
        setShowExecutionModal(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to dispatch script';
        toast({ title: 'Submission failed', description: msg, variant: 'destructive' });
      }
    },
    [allDevices, selectedIds, toast, dispatchBatch],
  );

  const onFormError = useCallback(
    (formErrors: Record<string, { message?: string }>) => {
      const firstError = Object.values(formErrors)[0];
      if (firstError?.message) {
        toast({ title: 'Validation error', description: firstError.message, variant: 'destructive' });
      }
    },
    [toast],
  );

  const handleViewLogs = useCallback(() => {
    setShowExecutionModal(false);
    router.push('/logs-page');
  }, [router]);

  const actions = useMemo(
    () => [
      {
        label: 'Run Script',
        onClick: handleSubmit(onSubmit, onFormError),
        variant: 'accent' as const,
        disabled: selectedIds.size === 0,
        loading: isSubmitting,
      },
    ],
    [handleSubmit, onSubmit, onFormError, selectedIds.size, isSubmitting],
  );

  if (!script) {
    return <NotFoundError message="Script not found" />;
  }

  return (
    <PageLayout
      title="Run Script"
      backButton={{ label: 'Back', onClick: handleBack }}
      actions={actions}
      className="md:px-[var(--spacing-system-l)] md:pb-[var(--spacing-system-l)]"
    >
      <div className="flex-1 overflow-auto">
        <ScriptSummaryCard
          name={script.name}
          description={script.description}
          shellId={shellToId(script.shell)}
          platforms={supportedPlatforms}
          author={script.author ? initiatorName(script.author) : null}
          showTimeout={false}
        />

        <div className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
          <div>
            <Label className="text-ods-text-primary font-semibold text-lg">Timeout</Label>
            <Controller
              name="timeout"
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

        <div className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <div className="pt-6 space-y-1">
          <DeviceSelector
            devices={allDevices}
            loading={isLoadingDevices}
            selectedIds={selectedIds}
            getDeviceKey={getDevicePrimaryId}
            onSelectionChange={setSelectedIds}
            showSelectionModeRadio={false}
            addAllBehavior="replace"
            isDeviceDisabled={d => (!getMachineId(d) ? 'Agent is not\nconnected' : undefined)}
          />
        </div>
      </div>

      <ExecutionStartedModal
        isOpen={showExecutionModal}
        onClose={() => setShowExecutionModal(false)}
        scriptName={script.name || 'Script'}
        onViewLogs={handleViewLogs}
      />
    </PageLayout>
  );
}

export function RunScriptView({ scriptId }: RunScriptViewProps) {
  return (
    <Suspense fallback={<RunScriptSkeleton />}>
      <RunScriptContent scriptId={scriptId} />
    </Suspense>
  );
}

export default RunScriptView;
