'use client';

import {
  CardLoader,
  FormPageContainer,
  Label,
  LoadError,
  NotFoundError,
} from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ScriptEditor } from '../../../scripts/components/script/script-editor';
import { LiveTestPanel } from '../../components/live-test-panel';
import { useLiveCampaign } from '../../hooks/use-live-campaign';
import { useQueries } from '../../hooks/use-queries';
import { useQueryDetails } from '../hooks/use-query-details';

const queryFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  query: z.string(),
  interval: z.number().min(0),
});

type QueryFormData = z.infer<typeof queryFormSchema>;

interface EditQueryPageProps {
  queryId: string | null;
}

export function EditQueryPage({ queryId }: EditQueryPageProps) {
  const router = useRouter();
  const { toast } = useToast();

  const numericId = queryId ? parseInt(queryId, 10) : null;
  const isExistingQuery = numericId !== null && !isNaN(numericId);

  const {
    queryDetails,
    isLoading: isLoadingQuery,
    error: queryError,
  } = useQueryDetails(isExistingQuery ? numericId : null);
  const { createQuery, isCreating, updateQuery, isUpdating } = useQueries();

  const isSaving = isCreating || isUpdating;

  const campaign = useLiveCampaign();
  const [showTestPanel, setShowTestPanel] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<QueryFormData>({
    resolver: zodResolver(queryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      query: '',
      interval: 0,
    },
  });

  const nameValue = watch('name');
  const queryValue = watch('query');

  useEffect(() => {
    if (queryDetails && isExistingQuery) {
      reset({
        name: queryDetails.name,
        description: queryDetails.description || '',
        query: queryDetails.query || '',
        interval: queryDetails.interval ?? 0,
      });
    }
  }, [queryDetails, isExistingQuery, reset]);

  const handleBack = useCallback(() => {
    if (isExistingQuery && numericId) {
      router.push(`/monitoring/query/${numericId}`);
    } else {
      router.push('/monitoring?tab=queries');
    }
  }, [isExistingQuery, numericId, router]);

  const onSubmit = useCallback(
    (data: QueryFormData) => {
      const payload = {
        name: data.name,
        description: data.description,
        query: data.query,
        interval: data.interval,
      };

      if (isExistingQuery && numericId) {
        updateQuery(numericId, payload, {
          onSuccess: () => router.push(`/monitoring/query/${numericId}`),
        });
      } else {
        createQuery(payload, {
          onSuccess: () => router.push('/monitoring?tab=queries'),
        });
      }
    },
    [isExistingQuery, numericId, createQuery, updateQuery, router],
  );

  const onFormError = useCallback(() => {
    const firstError = Object.values(errors)[0];
    if (firstError?.message) {
      toast({ title: 'Validation error', description: firstError.message, variant: 'destructive' });
    }
  }, [errors, toast]);

  const handleTestQuery = useCallback(() => {
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
    if (isExistingQuery) {
      items.push({
        label: 'Cancel',
        onClick: handleBack,
        variant: 'outline' as const,
      });
    }
    items.push({
      label: 'Test Query',
      onClick: handleTestQuery,
      variant: 'outline' as const,
      icon: <Play size={16} />,
      disabled: !queryValue.trim() || campaign.isRunning,
    });
    items.push({
      label: 'Save Query',
      onClick: handleSubmit(onSubmit, onFormError),
      variant: 'primary' as const,
      disabled: isSaving || !nameValue.trim(),
    });
    return items;
  }, [
    handleSubmit,
    onSubmit,
    onFormError,
    isSaving,
    nameValue,
    isExistingQuery,
    handleBack,
    handleTestQuery,
    queryValue,
    campaign.isRunning,
  ]);

  if (isLoadingQuery && isExistingQuery) {
    return <CardLoader items={4} />;
  }

  if (queryError && isExistingQuery) {
    return <LoadError message={`Error loading query: ${queryError}`} />;
  }

  if (isExistingQuery && !queryDetails && !isLoadingQuery) {
    return <NotFoundError message="Query not found" />;
  }

  return (
    <FormPageContainer
      title={isExistingQuery && queryDetails ? queryDetails.name : 'New Query'}
      backButton={{
        label: 'Back to Queries',
        onClick: handleBack,
      }}
      actions={actions}
      padding="none"
    >
      <div className="space-y-10">
        {/* Test Query Panel */}
        {showTestPanel && (
          <LiveTestPanel
            mode="query"
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
              placeholder="Enter Query Name"
            />
          </div>
          {errors.name && <p className="text-[var(--ods-attention-red-error)] text-sm mt-1">{errors.name.message}</p>}
        </div>

        {/* Frequency */}
        <div className="space-y-1">
          <label className="text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary">
            Frequency
          </label>
          <div
            className={`bg-ods-card rounded-md border px-3 py-3 h-[60px] flex items-center ${errors.interval ? 'border-[var(--ods-attention-red-error)]' : 'border-ods-border'}`}
          >
            <input
              type="number"
              min={0}
              {...register('interval', { valueAsNumber: true })}
              className="w-full bg-transparent text-lg font-['DM_Sans:Medium',_sans-serif] font-medium text-ods-text-primary outline-none placeholder:text-ods-text-secondary"
              placeholder="Interval in seconds (0 = manual)"
            />
          </div>
          {errors.interval && (
            <p className="text-[var(--ods-attention-red-error)] text-sm mt-1">{errors.interval.message}</p>
          )}
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
              placeholder="Enter Query Description"
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
      </div>
    </FormPageContainer>
  );
}
