'use client';

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@flamingo-stack/openframe-frontend-core';
import { SelectButton } from '@flamingo-stack/openframe-frontend-core/components/features';
import { CheckCircleIcon, ExternalLinkIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, CheckboxBlock, Input } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from 'react-relay';
import { z } from 'zod';
import type { createScriptMutation as CreateScriptMutationType } from '@/__generated__/createScriptMutation.graphql';
import { createScriptMutation } from '@/graphql/scripts/create-script-mutation';
import { getRelayErrorMessage } from '@/lib/handle-api-error';
import { AVAILABLE_PLATFORMS, DISABLED_PLATFORMS } from '@/lib/platforms';
import { routes } from '@/lib/routes';
import { ScriptEditor } from '../../scripts/components/script/script-editor';
import { EDIT_SCRIPT_DEFAULT_VALUES } from '../../scripts/types/edit-script.types';
import { formToWriteInput } from '../../scripts/v2/utils/script-mappers';
import { SCRIPT_V2_SHELL_TYPES } from '../../scripts/v2/utils/shell-types';
import { onboardingHintUrl } from '../onboarding-coach-marks';
import { useStepActionState } from '../use-step-action-state';

// Trimmed subset of the full add-script form (`edit-script.types.ts`): the fields
// the onboarding step exposes. The rest are filled from EDIT_SCRIPT_DEFAULT_VALUES
// before mapping to the write input.
const onboardingScriptSchema = z.object({
  name: z.string().min(1, 'Please enter a script name'),
  shell: z.string().min(1, 'Please select a shell type'),
  default_timeout: z
    .number({ error: 'Please enter a valid timeout value' })
    .min(1, 'Timeout must be at least 1 second')
    .max(86400, 'Timeout must not exceed 24 hours (86400 seconds)'),
  run_as_user: z.boolean(),
  supported_platforms: z.array(z.string()).min(1, 'Please select at least one platform'),
  script_body: z.string().min(1, 'Please add script content'),
});

type OnboardingScriptForm = z.infer<typeof onboardingScriptSchema>;

/**
 * Inner body of the "Scripting" onboarding step — a trimmed version of the full
 * add-script form ({@link ../../scripts/v2/components/edit-script-page}). It reuses
 * the same primitives (platform `SelectButton`s, shell `Select`, `ScriptEditor`) and
 * the native `createScriptMutation` + `formToWriteInput` mapper. On "Add Script" it
 * creates the script and redirects to its details page with the coach-mark hint.
 */
export function ScriptingStep({
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

  const form = useForm<OnboardingScriptForm>({
    resolver: zodResolver(onboardingScriptSchema),
    // Windows pre-selected to match the design; timeout defaults to 90s.
    defaultValues: {
      name: '',
      shell: '',
      default_timeout: 90,
      run_as_user: false,
      supported_platforms: ['windows'],
      script_body: '',
    },
    mode: 'onChange',
  });

  const [commitCreate, isCreating] = useMutation<CreateScriptMutationType>(createScriptMutation);
  const actions = useStepActionState({ completing, primaryBusy: isCreating });
  const selectedPlatforms = form.watch('supported_platforms');

  const handleAddScript = form.handleSubmit(
    data => {
      const input = formToWriteInput({ ...EDIT_SCRIPT_DEFAULT_VALUES, ...data });
      commitCreate({
        variables: { input },
        onCompleted: response => {
          const newId = response.createScript?.id;
          toast({ title: 'Success', description: 'Script created successfully', variant: 'success' });
          // A successful create completes the onboarding step (if not already done).
          if (!completed) onComplete?.();
          router.push(newId ? onboardingHintUrl(routes.scriptsV2.details(newId), 'scripts', pathname) : '/scripts-v2');
        },
        onError: err => {
          toast({
            title: 'Error',
            description: getRelayErrorMessage(err, 'Failed to create script'),
            variant: 'destructive',
          });
        },
      });
    },
    errors => {
      const messages = Object.values(errors)
        .map(e => (e as { message?: string } | undefined)?.message)
        .filter((m): m is string => Boolean(m));
      toast({
        title: 'Cannot add script yet',
        description: messages.length > 0 ? messages.join(', ') : 'Please fill in all required fields.',
        variant: 'destructive',
      });
    },
  );

  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      <p className="text-h4 text-ods-text-primary">
        Scripts automate routine work across your devices. Restart a service, clear a cache, check disk space. Every run
        is logged, so you always know what ran where.
      </p>
      <p className="text-h4 text-ods-text-primary">
        Start with something simple. Give it a name and paste your commands. Once saved, you can run it on any connected
        device.
      </p>

      {/* Supported Platform + Run as User */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-xxs)]">
        <Label className="text-h4 text-ods-text-primary">Supported Platform</Label>
        <div className="grid grid-cols-2 gap-[var(--spacing-system-m)] lg:grid-cols-4">
          {AVAILABLE_PLATFORMS.map(p => {
            const isDisabled = DISABLED_PLATFORMS.includes(p.id);
            return (
              <SelectButton
                key={p.id}
                title={p.name}
                icon={<p.icon className="size-5" />}
                selected={!isDisabled && selectedPlatforms.includes(p.id)}
                disabled={isDisabled}
                onClick={
                  isDisabled
                    ? undefined
                    : () => {
                        const current = form.getValues('supported_platforms');
                        const has = current.includes(p.id);
                        form.setValue(
                          'supported_platforms',
                          has ? current.filter(id => id !== p.id) : [...current, p.id],
                          { shouldValidate: true },
                        );
                      }
                }
              />
            );
          })}
          <Controller
            name="run_as_user"
            control={form.control}
            render={({ field }) => (
              <CheckboxBlock
                checked={field.value}
                onCheckedChange={checked => field.onChange(checked)}
                label="Run as User"
                // Match the SelectButton card height (h-11 md:h-16).
                className="[&>label]:h-11 md:[&>label]:h-16 [&>label]:min-h-0"
              />
            )}
          />
        </div>
      </div>

      {/* Name / Shell Type / Timeout */}
      <div className="grid grid-cols-1 gap-[var(--spacing-system-l)] md:grid-cols-2 lg:grid-cols-3">
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
                placeholder="Enter Script Name Here"
                error={fieldState.error?.message}
                invalid={!!fieldState.error}
              />
            </div>
          )}
        />
        <Controller
          name="shell"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
              <Label className="text-h4 text-ods-text-primary">Shell Type</Label>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger error={fieldState.error?.message} invalid={!!fieldState.error}>
                  <SelectValue placeholder="Select Shell Type" />
                </SelectTrigger>
                <SelectContent>
                  {SCRIPT_V2_SHELL_TYPES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-[var(--spacing-system-xs)]">
                        <s.icon className="size-5" />
                        <span>{s.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
        <Controller
          name="default_timeout"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
              <Label className="text-h4 text-ods-text-primary">Timeout</Label>
              <Input
                type="number"
                value={field.value}
                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : '')}
                placeholder="90"
                endAdornment={<span className="text-h6 text-ods-text-secondary">Seconds</span>}
                error={fieldState.error?.message}
                invalid={!!fieldState.error}
              />
            </div>
          )}
        />
      </div>

      {/* Syntax */}
      <Controller
        name="script_body"
        control={form.control}
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
            <Label className="text-h4 text-ods-text-primary">Syntax</Label>
            <ScriptEditor
              value={field.value}
              onChange={field.onChange}
              shell={form.watch('shell')}
              height="240px"
              invalid={!!fieldState.error}
            />
          </div>
        )}
      />

      {/* Footer: full-form link (left) + Mark as Complete + Add Script (right) */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
        <Link
          href={routes.scriptsV2.new}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center gap-[var(--spacing-system-xs)] text-ods-text-secondary transition-colors hover:text-ods-text-primary"
        >
          <ExternalLinkIcon size={24} className="shrink-0" />
          <span className="text-h4 underline">Full Script Form</span>
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
              handleAddScript();
            }}
            loading={actions.primary.loading}
            disabled={actions.primary.disabled}
            className="w-full md:flex-1"
          >
            Add Script
          </Button>
        </div>
      </div>
    </div>
  );
}
