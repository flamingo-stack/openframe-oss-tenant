'use client';

import { CardLoader, FormPageContainer, LoadError, NotFoundError } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ScriptEditor } from '../../../scripts/components/script/script-editor';
import { LiveTestPanel } from '../../components/live-test-panel';
import { useLiveCampaign } from '../../hooks/use-live-campaign';
import { usePolicies } from '../../hooks/use-policies';
import { usePolicyDetails } from '../hooks/use-policy-details';
import { usePolicyHosts, useReplacePolicyHosts } from '../hooks/use-policy-hosts';
import { PolicyDeviceSelector } from './policy-device-selector';

const policyFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  query: z.string(),
});

type PolicyFormData = z.infer<typeof policyFormSchema>;

interface EditPolicyPageProps {
  policyId: string | null;
}

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

  const isSaving = isCreating || isUpdating || replacePolicyHostsMutation.isPending;

  const campaign = useLiveCampaign();
  const [showTestPanel, setShowTestPanel] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PolicyFormData>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      name: '',
      description: '',
      query: '',
    },
  });

  const nameValue = watch('name');
  const queryValue = watch('query');

  useEffect(() => {
    if (policyDetails && isExistingPolicy) {
      reset({
        name: policyDetails.name,
        description: policyDetails.description || '',
        query: policyDetails.query || '',
      });
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
    campaign.startCampaign(queryValue);
  }, [campaign, queryValue]);

  const handleTestAgain = useCallback(() => {
    campaign.startCampaign(queryValue);
  }, [campaign, queryValue]);

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
      disabled: !queryValue.trim() || campaign.isRunning,
    });
    items.push({
      label: 'Save Policy',
      onClick: handleSubmit(onSubmit, onFormError),
      variant: 'primary' as const,
      disabled: isSaving || !nameValue.trim(),
    });
    return items;
  }, [handleSubmit, onSubmit, onFormError, isSaving, nameValue, handleTestPolicy, queryValue, campaign.isRunning]);

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
      <div className="space-y-10">
        {/* Test Policy Panel */}
        {showTestPanel && (
          <LiveTestPanel
            mode="policy"
            isRunning={campaign.isRunning}
            startedAt={campaign.startedAt}
            durationMs={campaign.durationMs}
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
        <div className="space-y-1">
          <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">Name</label>
          <div
            className={`bg-ods-card rounded-md border px-3 py-3 h-[60px] flex items-center ${errors.name ? 'border-[var(--ods-attention-red-error)]' : 'border-ods-border'}`}
          >
            <input
              type="text"
              {...register('name')}
              className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary outline-none placeholder:text-ods-text-secondary"
              placeholder="Enter Policy Name"
            />
          </div>
          {errors.name && <p className="text-[var(--ods-attention-red-error)] text-sm mt-1">{errors.name.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">
            Description
          </label>
          <div className="bg-ods-card rounded-md border border-ods-border relative">
            <textarea
              {...register('description')}
              rows={4}
              className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary outline-none placeholder:text-ods-text-secondary p-3 resize-none"
              placeholder="Enter Policy Description"
            />
          </div>
        </div>

        {/* Query */}
        <div className="space-y-1">
          <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">Query</label>
          <Controller
            name="query"
            control={control}
            render={({ field }) => (
              <ScriptEditor value={field.value} onChange={field.onChange} shell="sql" height="300px" />
            )}
          />
        </div>

        {/* Assigned Devices */}
        <div className="space-y-1">
          <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">
            Assigned Devices
          </label>
          <PolicyDeviceSelector
            selectedFleetHostIds={selectedFleetHostIds}
            onSelectionChange={setSelectedFleetHostIds}
            disabled={isSaving}
          />
        </div>
      </div>
    </FormPageContainer>
  );
}
