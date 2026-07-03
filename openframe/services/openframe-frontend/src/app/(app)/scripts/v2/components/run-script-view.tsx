'use client';

import { ScriptArguments } from '@flamingo-stack/openframe-frontend-core';
import {
  CheckboxBlock,
  Input,
  Label,
  type PageActionButton,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from 'react-relay';
import { z } from 'zod';
import type { batchRunScriptMutation as BatchRunScriptMutationType } from '@/__generated__/batchRunScriptMutation.graphql';
import { DeviceSelector } from '@/app/components/shared/device-selector';
import { batchRunScriptMutation } from '@/graphql/scripts/batch-run-script-mutation';
import { decodeGlobalId } from '@/lib/relay-id';
import { routes } from '@/lib/routes';
import type { Device } from '../../../devices/types/device.types';
import { CONTEXT_ENTITY_KIND } from '../../../mingo/context/context-types';
import { useTrackOpenView } from '../../../mingo/context/use-track-open-view';
import { ExecutionStartedModal } from '../../components/script/execution-started-modal';
import { scriptArgumentSchema } from '../../types/edit-script.types';
import { getDevicePrimaryId } from '../../utils/device-helpers';
import { parseKeyValues, serializeKeyValues } from '../../utils/script-key-values';
import { useRunDevices } from '../hooks/use-run-devices';
import { initiatorName } from '../utils/execution-helpers';
import { envVarsToInput, envVarsToPairs, platformsToIds, shellToId } from '../utils/script-mappers';
import { type ScriptDetailData, ScriptDetailGate } from './script-detail-gate';
import { ScriptPageChrome } from './script-page-chrome';
import { RUN_SUMMARY_LABELS, ScriptSummaryCard, ScriptSummaryCardSkeleton } from './script-summary-card';

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

interface RunScriptContentProps {
  scriptId: string;
  /** `undefined` while the script query is in flight — controls render disabled. */
  script: ScriptDetailData | undefined;
}

function RunScriptContent({ scriptId, script }: RunScriptContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const loading = script === undefined;

  // Keep this script as the Mingo "open view" while on the run surface (the detail
  // page unmounted on navigation). Raw db id — the route's `scriptId` is the Relay
  // global id (SCRIPT is GraphQL-resolved; the chip re-encodes it for `node(id:)`).
  const scriptDbId = useMemo(() => decodeGlobalId(scriptId)?.rawId ?? scriptId, [scriptId]);
  useTrackOpenView(
    script ? { type: CONTEXT_ENTITY_KIND.SCRIPT, id: scriptDbId, label: script.name || scriptDbId } : null,
  );

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
    formState: { isSubmitting, isDirty },
  } = useForm<RunFormData>({
    resolver: zodResolver(runFormSchema),
    defaultValues: { timeout: 90, runAsUser: false, scriptArgs: [], envVars: [] },
  });

  useEffect(() => {
    // `!isDirty` guard: the gate's store-and-network revalidation re-delivers the
    // script (new snapshot identity); once the user has touched the run config,
    // a late delivery must not clobber it. `reset` marks the form pristine, so
    // the initial seed always passes the guard.
    if (script && !isDirty) {
      const parsedArgs = parseKeyValues(script.defaultArgs ? [...script.defaultArgs] : [], ' ');
      const parsedEnv = envVarsToPairs(script.envVars);
      reset({
        timeout: script.defaultTimeoutSeconds ?? 90,
        // Seed from the script's saved privilege; the user can still toggle it per run.
        runAsUser: script.privilegeLevel === 'USER',
        // No placeholder rows when the script has none — the "Add" buttons are the
        // affordance; rows appear only when the script defines defaults or the user adds one.
        scriptArgs: parsedArgs,
        envVars: parsedEnv,
      });
    }
  }, [script, reset, isDirty]);

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

  const handleViewHistory = useCallback(() => {
    setShowExecutionModal(false);
    router.push(routes.scriptsV2.details(scriptId, { tab: 'executions' }));
  }, [router, scriptId]);

  const actions = useMemo<PageActionButton[]>(
    () => [
      {
        label: 'Run Script',
        onClick: handleSubmit(onSubmit, onFormError),
        variant: 'accent' as const,
        disabled: selectedIds.size === 0 || loading,
        loading: isSubmitting,
      },
    ],
    [handleSubmit, onSubmit, onFormError, selectedIds.size, isSubmitting, loading],
  );

  return (
    <>
      <ScriptPageChrome title="Run Script" backFallback={routes.scriptsV2.details(scriptId)} actions={actions}>
        {script ? (
          <ScriptSummaryCard
            name={script.name}
            description={script.description}
            shellId={shellToId(script.shell)}
            platforms={supportedPlatforms}
            author={script.author ? initiatorName(script.author) : null}
            showTimeout={false}
          />
        ) : (
          // Same 3 stats as the loaded card (`showTimeout` is off on the run page).
          <ScriptSummaryCardSkeleton labels={RUN_SUMMARY_LABELS} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-system-lf)] items-end">
          <div>
            <Label className="text-ods-text-primary text-h3">Timeout</Label>
            <Controller
              name="timeout"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  className="w-full"
                  value={field.value}
                  onChange={e => field.onChange(Number(e.target.value) || 0)}
                  disabled={loading}
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
                disabled={loading}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-system-lf)]">
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
                disabled={loading}
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
                disabled={loading}
              />
            )}
          />
        </div>

        <div className="space-y-[var(--spacing-system-xxs)]">
          <DeviceSelector
            devices={allDevices}
            loading={loading || isLoadingDevices}
            selectedIds={selectedIds}
            getDeviceKey={getDevicePrimaryId}
            onSelectionChange={setSelectedIds}
            showSelectionModeRadio={false}
            addAllBehavior="replace"
            isDeviceDisabled={d => (!getMachineId(d) ? 'Agent is not\nconnected' : undefined)}
          />
        </div>
      </ScriptPageChrome>

      <ExecutionStartedModal
        isOpen={showExecutionModal}
        onClose={() => setShowExecutionModal(false)}
        scriptName={script?.name || 'Script'}
        onViewResults={handleViewHistory}
      />
    </>
  );
}

export function RunScriptView({ scriptId }: RunScriptViewProps) {
  return (
    <ScriptDetailGate scriptId={scriptId}>
      {script => <RunScriptContent scriptId={scriptId} script={script} />}
    </ScriptDetailGate>
  );
}

export default RunScriptView;
