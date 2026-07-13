'use client';

import {
  LoadError,
  NotFoundError,
  PageLayout,
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
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { routes } from '@/lib/routes';
import { CONTEXT_ENTITY_KIND } from '../../../mingo/context/context-types';
import { useTrackOpenView } from '../../../mingo/context/use-track-open-view';
import { useRunScriptData } from '../../hooks/use-run-script-data';
import { rejectScriptsMigrationPending } from '../../lib/scripts-migration';
import { scriptArgumentSchema } from '../../types/edit-script.types';
import { getDevicePrimaryId } from '../../utils/device-helpers';
import { parseKeyValues } from '../../utils/script-key-values';
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

  // Keep this script as the Mingo "open view" while on the run surface (the detail
  // page unmounted on navigation). v1 is REST-backed — `scriptId` is already the
  // raw db id the backend SCRIPT resolver expects (no global-id decode needed).
  useTrackOpenView(
    scriptDetails ? { type: CONTEXT_ENTITY_KIND.SCRIPT, id: scriptId, label: scriptDetails.name || scriptId } : null,
  );

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

  const handleBack = useSafeBack(routes.scripts.details(scriptId));

  const onSubmit = useCallback(
    async (_data: RunFormData) => {
      if (selectedIds.size === 0) {
        toast({
          title: 'No devices selected',
          description: 'Please select at least one device.',
          variant: 'destructive',
        });
        return;
      }

      // TODO(openframe-rmm): Tactical RMM removed — running scripts on devices has no
      // backend until the OpenFrame RMM run API is wired up. Reject so the user gets a
      // clear "migration pending" toast instead of a silent no-op. See scripts-migration.ts.
      try {
        rejectScriptsMigrationPending();
        setShowExecutionModal(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to submit script';
        toast({ title: 'Submission failed', description: msg, variant: 'destructive' });
      }
    },
    [selectedIds, toast],
  );

  const handleCloseExecutionModal = useCallback(() => {
    setShowExecutionModal(false);
  }, []);

  const handleViewLogs = useCallback(() => {
    setShowExecutionModal(false);
    router.push(routes.logs.page);
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
        variant: 'accent' as const,
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
    <PageLayout
      title="Run Script"
      backButton={{ label: 'Back', onClick: handleBack }}
      actions={actions}
      actionsVariant="primary-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
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
          />
        </div>
      </div>

      <ExecutionStartedModal
        isOpen={showExecutionModal}
        onClose={handleCloseExecutionModal}
        scriptName={scriptDetails.name || 'Script'}
        onViewResults={handleViewLogs}
        viewLabel="View Logs"
        resultsLocation="activity logs section"
      />
    </PageLayout>
  );
}

export default RunScriptView;
