'use client';

import { Input, Label } from '@flamingo-stack/openframe-frontend-core';
import { CheckCircleIcon, ExternalLinkIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { DeviceSelector } from '@/app/components/shared/device-selector';
import { routes } from '@/lib/routes';
import type { Device } from '../../devices/types/device.types';
import { getFleetHostId } from '../../devices/utils/device-action-utils';
import { usePolicies } from '../../monitoring/hooks/use-policies';
import { usePolicyDevices } from '../../monitoring/policy/hooks/use-policy-devices';
import { useReplacePolicyHosts } from '../../monitoring/policy/hooks/use-policy-hosts';
import { ScriptEditor } from '../../scripts/components/script/script-editor';
import { onboardingHintUrl } from '../onboarding-coach-marks';
import { useStepActionState } from '../use-step-action-state';

const monitoringPolicySchema = z.object({
  name: z.string().min(1, 'Please enter a policy name'),
  query: z.string(),
});

type MonitoringPolicyForm = z.infer<typeof monitoringPolicySchema>;

const getDeviceKey = (d: Device) => {
  const id = getFleetHostId(d);
  return id !== undefined ? String(id) : undefined;
};

/**
 * Inner body of the "Monitoring" onboarding step — a trimmed version of the full
 * create-policy form ({@link ../../monitoring/policy/components/edit-policy-page}).
 * It reuses the same data layer (`usePolicies`, `usePolicyDevices`,
 * `useReplacePolicyHosts`) and the shared `DeviceSelector`. On "Add Policy" it
 * creates the policy, assigns the selected devices, then redirects to the policy
 * details page with the coach-mark hint.
 */
export function MonitoringStep({
  onComplete,
  completed,
  completing,
}: {
  onComplete?: () => void;
  completed?: boolean;
  completing?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const { createPolicy, isCreating } = usePolicies();
  const { devices: policyDevices, isLoading: isLoadingDevices } = usePolicyDevices();
  const replacePolicyHostsMutation = useReplacePolicyHosts();
  const isSaving = isCreating || replacePolicyHostsMutation.isPending;
  const actions = useStepActionState({ completing, primaryBusy: isSaving });

  const [selectedFleetHostIds, setSelectedFleetHostIds] = useState<Set<number>>(new Set());
  const stringSelectedIds = useMemo(
    () => new Set(Array.from(selectedFleetHostIds).map(String)),
    [selectedFleetHostIds],
  );
  const handleDeviceSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedFleetHostIds(
      new Set(
        Array.from(ids)
          .map(Number)
          .filter(n => !Number.isNaN(n)),
      ),
    );
  }, []);

  const form = useForm<MonitoringPolicyForm>({
    resolver: zodResolver(monitoringPolicySchema),
    defaultValues: { name: '', query: '' },
    mode: 'onChange',
  });

  const handleAddPolicy = form.handleSubmit(
    data => {
      createPolicy(
        { name: data.name, description: '', query: data.query, platform: undefined },
        {
          onSuccess: async policy => {
            const hostIds = Array.from(selectedFleetHostIds);
            try {
              if (hostIds.length > 0) {
                await replacePolicyHostsMutation.mutateAsync({ policyId: policy.id, hostIds });
              }
            } catch {
              // Policy created but host assignment failed — error toast shown by the mutation hook.
            }
            // A successful create completes the onboarding step (if not already done).
            if (!completed) onComplete?.();
            router.push(onboardingHintUrl(routes.monitoring.policy(policy.id), 'policies', pathname));
          },
        },
      );
    },
    errors => {
      const first = Object.values(errors)[0] as { message?: string } | undefined;
      toast({
        title: 'Cannot add policy yet',
        description: first?.message ?? 'Please fill in all required fields.',
        variant: 'destructive',
      });
    },
  );

  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      <p className="text-h4 text-ods-text-primary">
        Policies are rule sets that watch your devices. Set a threshold for things like CPU, disk, or memory, then
        assign the policy to devices. When a device crosses the line, you get an alert right away.
      </p>

      {/* Name */}
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
            <Label className="text-h4 text-ods-text-primary">Name</Label>
            <Input
              type="text"
              value={field.value}
              onChange={field.onChange}
              placeholder="Enter Policy Name"
              error={fieldState.error?.message}
              invalid={!!fieldState.error}
            />
          </div>
        )}
      />

      {/* Query */}
      <Controller
        name="query"
        control={form.control}
        render={({ field }) => (
          <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
            <Label className="text-h4 text-ods-text-primary">Query</Label>
            <ScriptEditor value={field.value} onChange={field.onChange} shell="sql" height="240px" />
          </div>
        )}
      />

      {/* Devices */}
      <DeviceSelector
        devices={policyDevices}
        loading={isLoadingDevices}
        selectedIds={stringSelectedIds}
        getDeviceKey={getDeviceKey}
        onSelectionChange={handleDeviceSelectionChange}
        disabled={isSaving}
        showSelectionModeRadio={false}
        addAllBehavior="merge"
        isDeviceDisabled={d => (getFleetHostId(d) === undefined ? 'Fleet agent is\nnot installed' : undefined)}
      />

      {/* Footer: full-form link (left) + Mark as Complete + Add Policy (right) */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
        <Link
          href={routes.monitoring.policyNew}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center gap-[var(--spacing-system-xs)] text-ods-text-secondary transition-colors hover:text-ods-text-primary"
        >
          <ExternalLinkIcon size={24} className="shrink-0" />
          <span className="text-h4 underline">Full Policy Form</span>
        </Link>
        <div className="flex flex-1 flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
          {!completed ? (
            <Button
              variant="outline"
              leftIcon={<CheckCircleIcon className="size-5" />}
              onClick={() => {
                actions.begin('complete');
                onComplete?.();
              }}
              loading={actions.complete.loading}
              disabled={actions.complete.disabled}
              className="w-full md:flex-1"
            >
              Mark as Complete
            </Button>
          ) : (
            // Keep the completed step's primary button its own width — don't let it
            // stretch into the removed "Mark as Complete" slot.
            <div className="hidden md:block md:flex-1" aria-hidden />
          )}
          <Button
            variant="accent"
            onClick={() => {
              actions.begin('primary');
              handleAddPolicy();
            }}
            loading={actions.primary.loading}
            disabled={actions.primary.disabled}
            className="w-full md:flex-1"
          >
            Add Policy
          </Button>
        </div>
      </div>
    </div>
  );
}
