'use client';

import {
  DetailPageContainer,
  LoadError,
  NotFoundError,
  ScriptArguments,
  ScriptInfoSection,
} from '@flamingo-stack/openframe-frontend-core';
import { Input, Label, ListLoader } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { DeviceSelector } from '@/app/components/shared/device-selector';
import { tacticalApiClient } from '@/lib/tactical-api-client';
import { getTacticalAgentId } from '../../../devices/utils/device-action-utils';
import { useRunScriptData } from '../../hooks/use-run-script-data';
import { scriptArgumentSchema } from '../../types/edit-script.types';
import { getDevicePrimaryId, resolveOsTypeFromDevices, resolveShellForExecution } from '../../utils/device-helpers';
import { parseKeyValues, serializeKeyValues } from '../../utils/script-key-values';
import { ExecutionStartedModal } from './execution-started-modal';

interface RunScriptViewProps {
  scriptId: string;
}

const runFormSchema = z.object({
  timeout: z.number().min(1, 'Timeout must be at least 1 second').max(86400, 'Timeout cannot exceed 24 hours'),
  scriptArgs: z.array(scriptArgumentSchema),
  envVars: z.array(scriptArgumentSchema),
});

type RunFormData = z.infer<typeof runFormSchema>;

export function RunScriptView({ scriptId }: RunScriptViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const {
    scriptDetails,
    isLoadingScript,
    scriptError,
    devices: allDevices,
    isLoadingDevices,
  } = useRunScriptData({ scriptId });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<RunFormData>({
    resolver: zodResolver(runFormSchema),
    defaultValues: { timeout: 90, scriptArgs: [], envVars: [] },
  });

  const [showExecutionModal, setShowExecutionModal] = useState(false);

  useEffect(() => {
    if (scriptDetails) {
      reset({
        timeout: Number(scriptDetails.default_timeout) || 90,
        scriptArgs: parseKeyValues(scriptDetails.args, ' '),
        envVars: parseKeyValues(scriptDetails.env_vars),
      });
    }
  }, [scriptDetails, reset]);

  const handleBack = useCallback(() => {
    router.push(`/scripts/details/${scriptId}`);
  }, [router, scriptId]);

  const onSubmit = useCallback(
    async (data: RunFormData) => {
      if (selectedIds.size === 0) {
        toast({
          title: 'No devices selected',
          description: 'Please select at least one device.',
          variant: 'destructive',
        });
        return;
      }

      try {
        const selectedDevices = allDevices.filter(d => selectedIds.has(getDevicePrimaryId(d)));
        const selectedAgentIds = selectedDevices.map(d => getTacticalAgentId(d)).filter((id): id is string => !!id);

        if (selectedAgentIds.length === 0) {
          toast({
            title: 'No compatible agents',
            description: 'Selected devices have no Tactical agent IDs.',
            variant: 'destructive',
          });
          return;
        }

        const osType = resolveOsTypeFromDevices(selectedDevices);
        const shell = resolveShellForExecution(osType, scriptDetails?.shell);

        const payload = {
          mode: 'script',
          target: 'agents',
          monType: 'all',
          osType,
          cmd: '',
          shell,
          custom_shell: null,
          custom_field: null,
          collector_all_output: false,
          save_to_agent_note: false,
          patchMode: 'scan',
          offlineAgents: false,
          client: null,
          site: null,
          agents: selectedAgentIds,
          script: Number(scriptDetails?.id),
          timeout: data.timeout,
          args: serializeKeyValues(data.scriptArgs, ' '),
          env_vars: serializeKeyValues(data.envVars),
          run_as_user: Boolean(scriptDetails?.run_as_user) || false,
        };

        const res = await tacticalApiClient.runBulkAction(payload);
        if (!res.ok) {
          throw new Error(res.error || `Bulk action failed with status ${res.status}`);
        }

        setShowExecutionModal(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to submit script';
        toast({ title: 'Submission failed', description: msg, variant: 'destructive' });
      }
    },
    [allDevices, selectedIds, scriptDetails, toast],
  );

  const handleCloseExecutionModal = useCallback(() => {
    setShowExecutionModal(false);
  }, []);

  const handleViewLogs = useCallback(() => {
    setShowExecutionModal(false);
    router.push(`/logs-page`);
  }, [router]);

  const onFormError = useCallback(
    (formErrors: Record<string, { message?: string }>) => {
      const firstError = Object.values(formErrors)[0];
      if (firstError?.message) {
        toast({ title: 'Validation error', description: firstError.message, variant: 'destructive' });
      }
    },
    [toast],
  );

  const actions = useMemo(
    () => [
      {
        label: 'Run Script',
        onClick: handleSubmit(onSubmit, onFormError),
        variant: 'primary' as const,
        disabled: selectedIds.size === 0,
        loading: isSubmitting,
      },
    ],
    [handleSubmit, onSubmit, onFormError, selectedIds.size, isSubmitting],
  );

  if (isLoadingScript) {
    return <ListLoader />;
  }

  if (scriptError) {
    return <LoadError message={`Error loading script: ${scriptError}`} />;
  }

  if (!scriptDetails) {
    return <NotFoundError message="Script not found" />;
  }

  return (
    <DetailPageContainer
      title="Run Script"
      backButton={{ label: 'Back to Script Details', onClick: handleBack }}
      actions={actions}
    >
      <div className="flex-1 overflow-auto">
        <ScriptInfoSection
          headline={scriptDetails.name}
          subheadline={scriptDetails.description}
          shellType={scriptDetails.shell}
          supportedPlatforms={scriptDetails.supported_platforms}
          category={scriptDetails.category}
        />

        {/* Timeout */}
        <div className="pt-6">
          <Label className="text-ods-text-primary font-semibold text-lg">Timeout</Label>
          <Controller
            name="timeout"
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                className="md:max-w-[320px] w-full"
                value={field.value}
                onChange={e => field.onChange(Number(e.target.value) || 0)}
                endAdornment={<span className="text-ods-text-secondary text-sm">Seconds</span>}
              />
            )}
          />
        </div>

        {/* Script Arguments & Environment Vars */}
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
            isDeviceDisabled={d => (!getTacticalAgentId(d) ? 'Tactical agent is\nnot installed' : undefined)}
          />
        </div>
      </div>

      <ExecutionStartedModal
        isOpen={showExecutionModal}
        onClose={handleCloseExecutionModal}
        scriptName={scriptDetails.name || 'Script'}
        onViewLogs={handleViewLogs}
      />
    </DetailPageContainer>
  );
}

export default RunScriptView;
