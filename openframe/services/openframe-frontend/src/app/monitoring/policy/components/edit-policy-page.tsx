'use client';

import {
  CardLoader,
  FormPageContainer,
  Input,
  Label,
  LoadError,
  NotFoundError,
  Textarea,
} from '@flamingo-stack/openframe-frontend-core';
import { OrganizationIcon } from '@flamingo-stack/openframe-frontend-core/components/features';
import { InfoCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { type TableColumn, Tag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import { DeviceSelector } from '../../../components/shared/device-selector';
import type { Device } from '../../../devices/types/device.types';
import { getFleetHostId } from '../../../devices/utils/device-action-utils';
import { getDeviceStatusConfig } from '../../../devices/utils/device-status';
import { ScriptEditor } from '../../../scripts/components/script/script-editor';
import { LiveTestPanel } from '../../components/live-test-panel';
import { useLiveCampaign } from '../../hooks/use-live-campaign';
import { usePolicies } from '../../hooks/use-policies';
import { usePolicyDetails } from '../hooks/use-policy-details';
import { usePolicyDevices } from '../hooks/use-policy-devices';
import { usePolicyHosts, useReplacePolicyHosts } from '../hooks/use-policy-hosts';

const policyFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  query: z.string(),
});

type PolicyFormData = z.infer<typeof policyFormSchema>;

interface EditPolicyPageProps {
  policyId: string | null;
}

const getDeviceKey = (d: Device) => {
  const id = getFleetHostId(d);
  return id !== undefined ? String(id) : undefined;
};

const monitoringExtraColumns: TableColumn<Device>[] = [
  {
    key: 'organization',
    label: 'ORGANIZATION',
    width: 'w-1/4',
    hideAt: 'lg',
    renderCell: (device: Device) => {
      const fullImageUrl = getFullImageUrl(device.organizationImageUrl);
      return (
        <div className="flex items-center gap-3">
          {featureFlags.organizationImages.displayEnabled() && (
            <OrganizationIcon
              imageUrl={fullImageUrl}
              organizationName={device.organization || 'Organization'}
              size="sm"
            />
          )}
          <span className="text-h4 text-ods-text-primary truncate">{device.organization || ''}</span>
        </div>
      );
    },
  },
  {
    key: 'status',
    label: 'STATUS',
    width: 'w-[140px]',
    hideAt: 'md',
    renderCell: (device: Device) => {
      const config = getDeviceStatusConfig(device.status);
      return <Tag label={config.label} variant={config.variant} />;
    },
  },
];

export function EditPolicyPage({ policyId }: EditPolicyPageProps) {
  const router = useRouter();
  const { toast } = useToast();

  const numericId = policyId ? parseInt(policyId, 10) : null;
  const isExistingPolicy = numericId !== null && !isNaN(numericId);

  const {
    policyDetails,
    isLoading: isLoadingPolicy,
    error: policyError,
  } = usePolicyDetails(isExistingPolicy ? numericId : null);
  const { createPolicy, isCreating, updatePolicy, isUpdating } = usePolicies();

  const { hosts: currentHosts, isLoading: isLoadingHosts } = usePolicyHosts(isExistingPolicy ? numericId : null);
  const replacePolicyHostsMutation = useReplacePolicyHosts();
  const { devices: policyDevices, isLoading: isLoadingDevices, infiniteScroll } = usePolicyDevices();

  const [selectedFleetHostIds, setSelectedFleetHostIds] = useState<Set<number>>(new Set());
  const [hostsInitialized, setHostsInitialized] = useState(false);

  // Initialize selected hosts from current assignment (edit mode)
  if (!hostsInitialized && !isLoadingHosts && isExistingPolicy && currentHosts.length > 0) {
    setSelectedFleetHostIds(new Set(currentHosts.map(h => h.id)));
    setHostsInitialized(true);
  }
  if (!hostsInitialized && !isLoadingHosts && (!isExistingPolicy || currentHosts.length === 0)) {
    setHostsInitialized(true);
  }

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

  const isSaving = isCreating || isUpdating || replacePolicyHostsMutation.isPending;

  const campaign = useLiveCampaign();
  const [showTestPanel, setShowTestPanel] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<PolicyFormData>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      name: '',
      description: '',
      query: '',
    },
  });

  const [hasQuery, setHasQuery] = useState(false);
  const [hasName, setHasName] = useState(false);

  useEffect(() => {
    if (policyDetails && isExistingPolicy) {
      reset({
        name: policyDetails.name,
        description: policyDetails.description || '',
        query: policyDetails.query || '',
      });
      setHasQuery(!!policyDetails.query?.trim());
      setHasName(!!policyDetails.name?.trim());
    }
  }, [policyDetails, isExistingPolicy, reset]);

  const handleBack = useCallback(() => {
    if (isExistingPolicy && numericId) {
      router.push(`/monitoring/policy/${numericId}`);
    } else {
      router.push('/monitoring?tab=policies');
    }
  }, [isExistingPolicy, numericId, router]);

  const onSubmit = useCallback(
    (data: PolicyFormData) => {
      const payload = {
        name: data.name,
        description: data.description,
        query: data.query,
        platform: undefined,
      };

      const hostIds = Array.from(selectedFleetHostIds);

      if (isExistingPolicy && numericId) {
        updatePolicy(numericId, payload, {
          onSuccess: async () => {
            try {
              await replacePolicyHostsMutation.mutateAsync({ policyId: numericId, hostIds });
            } catch {
              // Policy saved but hosts failed — error toast shown by mutation hook
            }
            router.push(`/monitoring/policy/${numericId}`);
          },
        });
      } else {
        createPolicy(payload, {
          onSuccess: async policy => {
            try {
              if (hostIds.length > 0) {
                await replacePolicyHostsMutation.mutateAsync({ policyId: policy.id, hostIds });
              }
            } catch {
              // Policy created but hosts failed — error toast shown by mutation hook
            }
            router.push('/monitoring?tab=policies');
          },
        });
      }
    },
    [isExistingPolicy, numericId, createPolicy, updatePolicy, router, selectedFleetHostIds, replacePolicyHostsMutation],
  );

  const onFormError = useCallback(() => {
    const firstError = Object.values(errors)[0];
    if (firstError?.message) {
      toast({ title: 'Validation error', description: firstError.message, variant: 'destructive' });
    }
  }, [errors, toast]);

  const handleTestPolicy = useCallback(() => {
    setShowTestPanel(true);
    campaign.startCampaign(getValues('query'), Array.from(selectedFleetHostIds));
  }, [campaign, getValues, selectedFleetHostIds]);

  const handleTestAgain = useCallback(() => {
    campaign.startCampaign(getValues('query'), Array.from(selectedFleetHostIds));
  }, [campaign, getValues, selectedFleetHostIds]);

  const handleCloseTestPanel = useCallback(() => {
    campaign.stopCampaign();
    setShowTestPanel(false);
  }, [campaign]);

  const actions = useMemo(() => {
    const items = [];
    items.push({
      label: 'Test Policy',
      onClick: handleTestPolicy,
      variant: 'outline' as const,
      disabled: !hasQuery || campaign.isRunning,
    });
    items.push({
      label: 'Save Policy',
      onClick: handleSubmit(onSubmit, onFormError),
      variant: 'primary' as const,
      disabled: isSaving || !hasName,
    });
    return items;
  }, [handleSubmit, onSubmit, onFormError, isSaving, hasName, handleTestPolicy, hasQuery, campaign.isRunning]);

  if (isLoadingPolicy && isExistingPolicy) {
    return <CardLoader items={4} />;
  }

  if (policyError && isExistingPolicy) {
    return <LoadError message={`Error loading policy: ${policyError}`} />;
  }

  if (isExistingPolicy && !policyDetails && !isLoadingPolicy) {
    return <NotFoundError message="Policy not found" />;
  }

  return (
    <FormPageContainer
      title={isExistingPolicy && policyDetails ? policyDetails.name : 'New Policy'}
      backButton={{
        label: 'Back to Policies',
        onClick: handleBack,
      }}
      actions={actions}
      padding="none"
    >
      <div className="space-y-6 md:space-y-8">
        {/* Test Policy Panel */}
        {showTestPanel && (
          <LiveTestPanel
            mode="policy"
            isRunning={campaign.isRunning}
            startedAt={campaign.startedAt}
            results={campaign.results}
            errors={campaign.errors}
            totals={campaign.totals}
            hostsResponded={campaign.hostsResponded}
            hostsFailed={campaign.hostsFailed}
            campaignStatus={campaign.campaignStatus}
            onTestAgain={handleTestAgain}
            onStop={campaign.stopCampaign}
            onClose={handleCloseTestPanel}
          />
        )}

        {/* Name */}
        <div className="md:max-w-[280px]">
          <Input
            {...register('name', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setHasName(!!e.target.value.trim()),
            })}
            label="Name"
            placeholder="Enter Policy Name"
            error={errors.name?.message}
          />
        </div>

        {/* Description */}
        <Textarea {...register('description')} label="Description" rows={3} placeholder="Enter Policy Description" />

        {/* Query */}
        <div className="space-y-1">
          <Label className="!mb-0">Query</Label>
          <Controller
            name="query"
            control={control}
            render={({ field }) => (
              <ScriptEditor
                value={field.value}
                onChange={val => {
                  field.onChange(val);
                  setHasQuery(!!val?.trim());
                }}
                shell="sql"
                height="300px"
              />
            )}
          />
          <a
            href="https://osquery.io/schema"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-ods-text-secondary hover:text-ods-text-primary transition-colors"
          >
            <InfoCircleIcon size={16} />
            Osquery Documentation
          </a>
        </div>

        {/* Devices */}
        <div className="space-y-1">
          <h2 className="text-h2 tracking-[-0.64px] text-ods-text-primary">Devices</h2>
          <DeviceSelector
            devices={policyDevices}
            loading={isLoadingDevices}
            selectedIds={stringSelectedIds}
            getDeviceKey={getDeviceKey}
            onSelectionChange={handleDeviceSelectionChange}
            infiniteScroll={infiniteScroll}
            disabled={isSaving}
            addAllBehavior="merge"
            extraColumns={monitoringExtraColumns}
          />
        </div>
      </div>
    </FormPageContainer>
  );
}
