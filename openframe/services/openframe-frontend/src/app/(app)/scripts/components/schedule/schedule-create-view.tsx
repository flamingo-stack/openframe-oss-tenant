'use client';

import {
  DetailPageContainer,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@flamingo-stack/openframe-frontend-core';
import { SelectButton } from '@flamingo-stack/openframe-frontend-core/components/features';
import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  CheckboxBlock,
  DatePickerInputSimple,
  Input,
  Label,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMdUp, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { useScriptSchedule } from '../../hooks/use-script-schedule';
import { useCreateScriptSchedule, useUpdateScriptSchedule } from '../../hooks/use-script-schedule-mutations';
import {
  buildCreatePayload,
  type CreateScheduleFormData,
  createScheduleFormSchema,
  type Platform,
  REPEAT_PERIOD_OPTIONS,
  scheduleDetailToFormData,
} from '../../types/script-schedule.types';
import { AVAILABLE_PLATFORMS, DISABLED_PLATFORMS } from '../../utils/script-utils';
import { ScheduleActionFormCard } from './schedule-action-form-card';
import { ScheduleCreateSkeleton } from './schedule-create-skeleton';

interface ScheduleCreateViewProps {
  scheduleId?: string;
}

export function ScheduleCreateView({ scheduleId }: ScheduleCreateViewProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const isMdUp = useMdUp();
  const isEditMode = Boolean(scheduleId);
  const { schedule, isLoading: isLoadingSchedule } = useScriptSchedule(scheduleId ?? '');
  const createMutation = useCreateScriptSchedule();
  const updateMutation = useUpdateScriptSchedule();

  const methods = useForm<CreateScheduleFormData>({
    resolver: zodResolver(createScheduleFormSchema),
    defaultValues: {
      name: '',
      note: '',
      scheduledDate: undefined,
      repeatEnabled: false,
      repeatInterval: 1,
      repeatPeriod: 'day',
      weekdays: 0,
      supportedPlatforms: ['windows'],
      enabled: true,
      actions: [
        {
          script: 0,
          name: '',
          timeout: 90,
          script_args: [],
          env_vars: [],
        },
      ],
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'actions',
  });

  useEffect(() => {
    if (isEditMode && schedule) {
      const formData = scheduleDetailToFormData(schedule);
      methods.reset(formData);
    }
  }, [isEditMode, schedule, methods]);

  const repeatEnabled = watch('repeatEnabled');
  const supportedPlatforms = watch('supportedPlatforms');

  const handleBack = useCallback(() => {
    isEditMode ? router.push(`/scripts/schedules/${scheduleId}`) : router.push('/scripts/?tab=schedules');
  }, [router, isEditMode, scheduleId]);

  const togglePlatform = useCallback(
    (platform: Platform) => {
      const current = methods.getValues('supportedPlatforms');
      if (current.includes(platform)) {
        if (current.length > 1) {
          methods.setValue(
            'supportedPlatforms',
            current.filter(p => p !== platform),
            { shouldValidate: true },
          );
        }
      } else {
        methods.setValue('supportedPlatforms', [...current, platform], { shouldValidate: true });
      }
    },
    [methods],
  );

  const addAction = useCallback(() => {
    append({
      script: 0,
      name: '',
      timeout: 90,
      script_args: [],
      env_vars: [],
    });
  }, [append]);

  const onSubmit = useCallback(
    async (data: CreateScheduleFormData) => {
      try {
        const payload = buildCreatePayload(data);
        if (isEditMode && scheduleId) {
          await updateMutation.mutateAsync({ id: scheduleId, payload });
          toast({
            title: 'Schedule updated',
            description: `Schedule "${data.name}" updated successfully.`,
            variant: 'success',
          });
          router.push(`/scripts/schedules/${scheduleId}`);
        } else {
          const result = await createMutation.mutateAsync(payload);
          toast({
            title: 'Schedule created',
            description: `Schedule "${data.name}" created successfully.`,
            variant: 'success',
          });
          router.push(`/scripts/schedules/${result.id}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : `Failed to ${isEditMode ? 'update' : 'create'} schedule`;
        toast({
          title: `${isEditMode ? 'Update' : 'Creation'} failed`,
          description: msg,
          variant: 'destructive',
        });
      }
    },
    [isEditMode, scheduleId, createMutation, updateMutation, toast, router],
  );

  const actions = useMemo(
    () => [
      {
        label: 'Cancel',
        onClick: handleBack,
        variant: 'outline' as const,
        showOnlyMobile: true,
      },
      {
        label: isEditMode ? 'Update Schedule' : 'Save Schedule',
        onClick: handleSubmit(onSubmit),
        variant: 'primary' as const,
        loading: isSubmitting || createMutation.isPending || updateMutation.isPending,
      },
    ],
    [isEditMode, handleSubmit, onSubmit, isSubmitting, createMutation.isPending, updateMutation.isPending, handleBack],
  );

  if (isEditMode && isLoadingSchedule) {
    return <ScheduleCreateSkeleton />;
  }

  return (
    <FormProvider {...methods}>
      <DetailPageContainer
        title={isEditMode ? 'Edit Script Schedule' : 'New Script Schedule'}
        backButton={{
          label: isEditMode ? 'Back to Schedule' : 'Back to Script Schedules',
          onClick: handleBack,
        }}
        actions={actions}
        className="p-[var(--spacing-system-l)]"
      >
        <div className="flex flex-col gap-6 overflow-auto">
          {/* Schedule Name */}
          <div className="flex flex-col gap-1">
            <Label className="text-h4">Schedule Name</Label>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  placeholder="Enter schedule name"
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full"
                  error={fieldState.error?.message}
                  invalid={!!fieldState.error}
                />
              )}
            />
          </div>

          {/* Note + Date + Repeat */}
          <div className="flex flex-wrap items-start gap-4">
            {/* <div className="flex flex-col gap-1 md:w-[220px] w-full">
              <Label className="text-ods-text-secondary font-medium text-[14px]">Note</Label>
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <Input
                    placeholder="Enter Note Here"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div> */}

            <Controller
              name="scheduledDate"
              control={control}
              render={({ field, fieldState }) => (
                <DatePickerInputSimple
                  placeholder="Select Date"
                  value={field.value}
                  onChange={field.onChange}
                  showTime
                  className="md:w-auto w-full"
                  error={fieldState.error?.message}
                  invalid={!!fieldState.error}
                />
              )}
            />

            <Controller
              name="repeatEnabled"
              control={control}
              render={({ field }) => (
                <CheckboxBlock
                  label="Repeat Script Run"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="md:max-w-[220px] w-full"
                />
              )}
            />

            {repeatEnabled && (
              <>
                <div className="flex flex-col gap-1">
                  {/* <Label className="text-ods-text-secondary font-medium text-[14px]">
                    Repeat in
                  </Label> */}
                  <Controller
                    name="repeatInterval"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input
                        type="number"
                        className="w-[100px]"
                        value={field.value}
                        onChange={e => field.onChange(e.target.value ? Number(e.target.value) : '')}
                        error={fieldState.error?.message}
                        invalid={!!fieldState.error}
                      />
                    )}
                  />
                </div>

                <Controller
                  name="repeatPeriod"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-[140px] bg-ods-card border border-ods-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPEAT_PERIOD_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </>
            )}
          </div>

          {/* Supported Platforms */}
          <div className="flex flex-col gap-2">
            <Label className="text-h4">Supported Platform</Label>
            <div className="flex gap-3 max-w-[920px]">
              {AVAILABLE_PLATFORMS.map(p => {
                const isDisabled = DISABLED_PLATFORMS.includes(p.id);
                return (
                  <SelectButton
                    key={p.id}
                    title={p.name}
                    icon={<p.icon className="w-5 h-5" />}
                    selected={!isDisabled && supportedPlatforms.includes(p.id)}
                    disabled={isDisabled}
                    tag={isDisabled ? (isMdUp ? 'Coming Soon' : 'Soon') : undefined}
                    onClick={isDisabled ? undefined : () => togglePlatform(p.id)}
                  />
                );
              })}
            </div>
          </div>

          {/* Scheduled Scripts */}
          <div className="flex flex-col gap-4">
            <h2 className="text-h2 text-ods-text-primary">Scheduled Scripts</h2>

            {fields.map((field, index) => (
              <ScheduleActionFormCard
                key={field.id}
                index={index}
                supportedPlatforms={supportedPlatforms}
                onRemove={() => remove(index)}
                canRemove={fields.length > 1}
              />
            ))}

            <Button
              variant="ghost-subtle"
              onClick={addAction}
              className="self-start text-ods-text-primary"
              leftIcon={<PlusCircleIcon size={20} />}
              noPadding
            >
              Add Script
            </Button>
          </div>
        </div>
      </DetailPageContainer>
    </FormProvider>
  );
}
