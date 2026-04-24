'use client';

import {
  CardLoader,
  FormPageContainer,
  Input,
  Label,
  LoadError,
  NotFoundError,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@flamingo-stack/openframe-frontend-core';
import { InfoCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { DeviceSelector } from '@/app/components/shared/device-selector';
import type { Device } from '../../../devices/types/device.types';
import { getFleetHostId } from '../../../devices/utils/device-action-utils';
import { ScriptEditor } from '../../../scripts/components/script/script-editor';
import { LiveTestPanel } from '../../components/live-test-panel';
import { useLiveCampaign } from '../../hooks/use-live-campaign';
import { useQueries } from '../../hooks/use-queries';
import { usePolicyDevices } from '../../policy/hooks/use-policy-devices';
import { useQueryDetails } from '../hooks/use-query-details';
import { useQueryHosts, useReplaceQueryHosts } from '../hooks/use-query-hosts';

const TIME_UNITS = [
  { value: 'minutes', label: 'Minutes', multiplier: 60 },
  { value: 'hours', label: 'Hours', multiplier: 3600 },
  { value: 'days', label: 'Days', multiplier: 86400 },
] as const;

type TimeUnit = (typeof TIME_UNITS)[number]['value'];

function secondsToUnitValue(totalSeconds: number): { value: number; unit: TimeUnit } {
  if (totalSeconds === 0) return { value: 0, unit: 'minutes' };
  for (let i = TIME_UNITS.length - 1; i >= 0; i--) {
    const { value: unitKey, multiplier } = TIME_UNITS[i];
    if (totalSeconds >= multiplier && totalSeconds % multiplier === 0) {
      return { value: totalSeconds / multiplier, unit: unitKey };
    }
  }
  return { value: Math.ceil(totalSeconds / 60), unit: 'minutes' };
}

function unitValueToSeconds(value: number, unit: TimeUnit): number {
  const found = TIME_UNITS.find(u => u.value === unit);
  return Math.max(0, Math.floor(value * (found?.multiplier ?? 1)));
}

const queryFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  query: z.string(),
  interval: z.number().min(300, 'Minimum interval is 5 minutes'),
});

type QueryFormData = z.infer<typeof queryFormSchema>;

interface EditQueryPageProps {
  queryId: string | null;
}

const getDeviceKey = (d: Device) => {
  const id = getFleetHostId(d);
  return id !== undefined ? String(id) : undefined;
};

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

  const { hosts: currentHosts, isLoading: isLoadingHosts } = useQueryHosts(isExistingQuery ? numericId : null);
  const replaceQueryHostsMutation = useReplaceQueryHosts();
  const { devices: queryDevices, isLoading: isLoadingDevices } = usePolicyDevices();

  const [selectedFleetHostIds, setSelectedFleetHostIds] = useState<Set<number>>(new Set());
  const [hostsInitialized, setHostsInitialized] = useState(false);

  // Initialize selected hosts from current assignment (edit mode)
  if (!hostsInitialized && !isLoadingHosts && isExistingQuery && currentHosts.length > 0) {
    setSelectedFleetHostIds(new Set(currentHosts.map(h => h.id)));
    setHostsInitialized(true);
  }
  if (!hostsInitialized && !isLoadingHosts && (!isExistingQuery || currentHosts.length === 0)) {
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

  const isSaving = isCreating || isUpdating || replaceQueryHostsMutation.isPending;

  const [frequencyValue, setFrequencyValue] = useState(0);
  const [frequencyUnit, setFrequencyUnit] = useState<TimeUnit>('minutes');

  const campaign = useLiveCampaign();
  const [showTestPanel, setShowTestPanel] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
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

  const [hasQuery, setHasQuery] = useState(false);
  const [hasName, setHasName] = useState(false);

  useEffect(() => {
    if (queryDetails && isExistingQuery) {
      const intervalSeconds = queryDetails.interval ?? 0;
      reset({
        name: queryDetails.name,
        description: queryDetails.description || '',
        query: queryDetails.query || '',
        interval: intervalSeconds,
      });
      setHasQuery(!!queryDetails.query?.trim());
      setHasName(!!queryDetails.name?.trim());
      const { value, unit } = secondsToUnitValue(intervalSeconds);
      setFrequencyValue(value);
      setFrequencyUnit(unit);
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

      const hostIds = Array.from(selectedFleetHostIds);

      if (isExistingQuery && numericId) {
        updateQuery(numericId, payload, {
          onSuccess: async () => {
            try {
              await replaceQueryHostsMutation.mutateAsync({ queryId: numericId, hostIds });
            } catch {
              // Query saved but hosts failed — error toast shown by mutation hook
            }
            router.push(`/monitoring/query/${numericId}`);
          },
        });
      } else {
        createQuery(payload, {
          onSuccess: async query => {
            try {
              if (hostIds.length > 0) {
                await replaceQueryHostsMutation.mutateAsync({ queryId: query.id, hostIds });
              }
            } catch {
              // Query created but hosts failed — error toast shown by mutation hook
            }
            router.push('/monitoring?tab=queries');
          },
        });
      }
    },
    [isExistingQuery, numericId, createQuery, updateQuery, router, selectedFleetHostIds, replaceQueryHostsMutation],
  );

  const onFormError = useCallback(
    (fieldErrors: Record<string, { message?: string }>) => {
      const firstError = Object.values(fieldErrors)[0];
      if (firstError?.message) {
        toast({ title: 'Validation error', description: firstError.message, variant: 'destructive' });
      }
    },
    [toast],
  );

  const handleTestQuery = useCallback(() => {
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
      label: 'Test Query',
      onClick: handleTestQuery,
      variant: 'card' as const,
      disabled: !hasQuery || campaign.isRunning,
    });
    items.push({
      label: 'Save Query',
      onClick: handleSubmit(onSubmit, onFormError),
      variant: 'primary' as const,
      disabled: isSaving || !hasName,
    });
    return items;
  }, [handleSubmit, onSubmit, onFormError, isSaving, hasName, handleTestQuery, hasQuery, campaign.isRunning]);

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
      <div className="space-y-6 md:space-y-8">
        {/* Test Query Panel */}
        {showTestPanel && (
          <LiveTestPanel
            mode="query"
            isRunning={campaign.isRunning}
            startedAt={campaign.startedAt}
            results={campaign.results}
            errors={campaign.errors}
            emptyResults={campaign.emptyResults}
            totals={campaign.totals}
            hostsResponded={campaign.hostsResponded}
            hostsFailed={campaign.hostsFailed}
            campaignStatus={campaign.campaignStatus}
            onTestAgain={handleTestAgain}
            onStop={campaign.stopCampaign}
            onClose={handleCloseTestPanel}
          />
        )}

        {/* Name & Frequency */}
        <div className="flex flex-col md:flex-row gap-4 md:items-end">
          {/* Name */}
          <div className="md:max-w-[280px] w-full">
            <Input
              {...register('name', {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setHasName(!!e.target.value.trim()),
              })}
              label="Name"
              placeholder="Enter Query Name"
              error={errors.name?.message}
            />
          </div>

          {/* Frequency */}
          <Controller
            name="interval"
            control={control}
            render={({ field, fieldState }) => {
              const handleValueChange = (raw: string) => {
                const num = raw === '' ? 0 : Math.max(0, Math.floor(Number(raw)));
                setFrequencyValue(num);
                field.onChange(unitValueToSeconds(num, frequencyUnit));
              };

              const handleUnitChange = (unit: string) => {
                const newUnit = unit as TimeUnit;
                setFrequencyUnit(newUnit);
                field.onChange(unitValueToSeconds(frequencyValue, newUnit));
              };

              return (
                <div className="space-y-1">
                  <Label className="!mb-0">Frequency</Label>
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      min={0}
                      value={frequencyValue}
                      onChange={e => handleValueChange(e.target.value)}
                      invalid={!!fieldState.error}
                      className="w-[120px]"
                      placeholder="0"
                    />
                    <Select value={frequencyUnit} onValueChange={handleUnitChange}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_UNITS.map(u => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* Description */}
        <Textarea {...register('description')} label="Description" rows={3} placeholder="Enter Query Description" />

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
            devices={queryDevices}
            loading={isLoadingDevices}
            selectedIds={stringSelectedIds}
            getDeviceKey={getDeviceKey}
            onSelectionChange={handleDeviceSelectionChange}
            disabled={isSaving}
            addAllBehavior="merge"
            isDeviceDisabled={d => (getFleetHostId(d) === undefined ? 'Fleet agent is\nnot installed' : undefined)}
          />
        </div>
      </div>
    </FormPageContainer>
  );
}
