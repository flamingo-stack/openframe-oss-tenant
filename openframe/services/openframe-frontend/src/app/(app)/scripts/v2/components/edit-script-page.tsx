'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { Controller } from 'react-hook-form';
import { useLazyLoadQuery, useMutation } from 'react-relay';
import type { runCommandMutation as RunCommandMutationType } from '@/__generated__/runCommandMutation.graphql';
import type { scriptDetailRelayQuery as ScriptDetailQueryType } from '@/__generated__/scriptDetailRelayQuery.graphql';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { runCommandMutation } from '@/graphql/scripts/run-command-mutation';
import { scriptDetailRelayQuery } from '@/graphql/scripts/script-detail-relay';
import { ExecutionStartedModal } from '../../components/script/execution-started-modal';
import { ScriptFormFields } from '../../components/script/script-form-fields';
import type { EditScriptFormData } from '../../types/edit-script.types';
import { useEditScriptForm } from '../hooks/use-edit-script-form';
import { relayScriptToForm, shellToEnum } from '../utils/script-mappers';
import { SCRIPT_V2_SHELL_TYPES } from '../utils/shell-types';
import { EditScriptSkeleton } from './edit-script-skeleton';
import { ScriptTagsManager } from './script-tags-manager';
import { type SelectedTestDevice, TestScriptModal } from './test-script-modal';

interface ScriptTag {
  id: string;
  key: string;
}

interface EditScriptFormProps {
  scriptId: string | null;
  initialValues: EditScriptFormData | null;
  initialTags: ReadonlyArray<ScriptTag>;
}

function EditScriptForm({ scriptId, initialValues, initialTags }: EditScriptFormProps) {
  const isEditMode = Boolean(scriptId);
  const { toast } = useToast();
  const handleBackToList = useSafeBack('/scripts-v2');
  const handleBackToDetails = useSafeBack(`/scripts-v2/details/${scriptId}`);
  const backButton = useMemo(
    () => ({ label: 'Back', onClick: isEditMode ? handleBackToDetails : handleBackToList }),
    [isEditMode, handleBackToDetails, handleBackToList],
  );

  const { form, isSubmitting, handleSave } = useEditScriptForm({ scriptId, initialValues, isEditMode });

  // Both actions reveal inline errors; each decides WHICH fields carry one via
  // its own `form.trigger` scope (Save → full schema, Test → runnable prereqs).
  const [showErrors, setShowErrors] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testDispatched, setTestDispatched] = useState(false);
  const [commitRunCommand] = useMutation<RunCommandMutationType>(runCommandMutation);

  const handleSaveClick = useCallback(() => {
    setShowErrors(true);
    handleSave();
  }, [handleSave]);

  const watchedSupportedPlatforms = form.watch('supported_platforms');

  // The test (runCommand) only needs a shell, a non-empty body and at least one
  // platform (so the device picker has candidates). timeout / privilege have
  // defaults. Validate these BEFORE opening the device picker so the user is
  // never sent through device selection only to hit a dead-end.
  //
  // `shell` and `script_body` are validated via the resolver (`trigger`) so their
  // errors and clearing are fully owned by RHF — the form runs in `onChange`
  // mode, so the red state disappears the moment the field becomes valid.
  const validateTestPrereqs = useCallback(async () => {
    // Trigger every runnable prerequisite (incl. platforms) so each sets/clears its
    // own inline error via the resolver — Save's full-schema validation is a superset.
    const [shellOk, bodyOk, platformsOk] = await Promise.all([
      form.trigger('shell'),
      form.trigger('script_body'),
      form.trigger('supported_platforms'),
    ]);

    const missing: string[] = [];
    if (!shellOk) {
      missing.push('a shell type');
    }
    if (!bodyOk) {
      missing.push('script content');
    }
    if (!platformsOk) {
      missing.push('a supported platform');
    }

    if (missing.length > 0) {
      toast({
        title: 'Cannot test yet',
        description: `Add ${missing.join(', ')} before testing the script.`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  }, [form, toast]);

  const handleOpenTest = useCallback(async () => {
    setShowErrors(true);
    if (await validateTestPrereqs()) {
      setIsTestModalOpen(true);
    }
  }, [validateTestPrereqs]);

  const handleDeviceSelected = useCallback(
    async (device: SelectedTestDevice) => {
      // Prereqs were validated before the picker opened; re-check defensively in
      // case the form changed while it was open.
      if (!(await validateTestPrereqs())) {
        setIsTestModalOpen(false);
        return;
      }
      const values = form.getValues();

      commitRunCommand({
        variables: {
          input: {
            machineId: device.machineId,
            shell: shellToEnum(values.shell),
            command: values.script_body,
            privilegeLevel: values.run_as_user ? 'USER' : 'ADMIN',
            timeoutSeconds: values.default_timeout,
          },
        },
        onCompleted: () => setTestDispatched(true),
        onError: err => {
          toast({
            title: 'Test failed',
            description: err instanceof Error ? err.message : 'Failed to dispatch test',
            variant: 'destructive',
          });
        },
      });
    },
    [form, commitRunCommand, toast, validateTestPrereqs],
  );

  const handleViewLogs = useCallback(() => {
    setTestDispatched(false);
    // Open logs in a new tab so the user doesn't lose the in-progress script edits.
    window.open('/logs-page', '_blank', 'noopener,noreferrer');
  }, []);

  const actions = useMemo(
    () => [
      {
        label: 'Test Script',
        onClick: handleOpenTest,
        variant: 'outline' as const,
      },
      {
        label: 'Save Script',
        onClick: handleSaveClick,
        variant: 'accent' as const,
        disabled: isSubmitting,
        loading: isSubmitting,
      },
    ],
    [handleSaveClick, isSubmitting, handleOpenTest],
  );

  return (
    <PageLayout
      title={isEditMode ? 'Edit Script' : 'New Script'}
      backButton={backButton}
      actions={actions}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <ScriptFormFields
        form={form}
        shellTypes={SCRIPT_V2_SHELL_TYPES}
        hideCategory
        showErrors={showErrors}
        tagsField={
          <Controller
            name="tag_ids"
            control={form.control}
            render={({ field }) => (
              <Suspense fallback={<Skeleton className="h-[72px] w-full" />}>
                <ScriptTagsManager selectedIds={field.value} onChange={field.onChange} initialTags={initialTags} />
              </Suspense>
            )}
          />
        }
      />

      <TestScriptModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onDeviceSelected={handleDeviceSelected}
        supportedPlatforms={watchedSupportedPlatforms}
      />

      <ExecutionStartedModal
        isOpen={testDispatched}
        onClose={() => setTestDispatched(false)}
        scriptName={form.getValues('name') || 'Script'}
        onViewLogs={handleViewLogs}
      />
    </PageLayout>
  );
}

function EditScriptLoader({ scriptId }: { scriptId: string }) {
  // `store-and-network`: always revalidate against the server (admin app — freshness
  // over cache). Safe for the edit form because the seeding effect is guarded on
  // `!isDirty` (see `useEditScriptForm`), so a background refresh only re-seeds while
  // the form is still pristine and never clobbers in-progress edits.
  const data = useLazyLoadQuery<ScriptDetailQueryType>(
    scriptDetailRelayQuery,
    { id: scriptId },
    { fetchPolicy: 'store-and-network' },
  );

  const initialValues = useMemo(() => (data.script ? relayScriptToForm(data.script) : null), [data.script]);
  const initialTags = useMemo(() => data.script?.tags?.map(t => ({ id: t.id, key: t.key })) ?? [], [data.script]);

  return <EditScriptForm scriptId={scriptId} initialValues={initialValues} initialTags={initialTags} />;
}

interface EditScriptPageProps {
  scriptId: string | null;
}

export function EditScriptPage({ scriptId }: EditScriptPageProps) {
  if (!scriptId) {
    return <EditScriptForm scriptId={null} initialValues={null} initialTags={[]} />;
  }

  return (
    <Suspense fallback={<EditScriptSkeleton />}>
      <EditScriptLoader scriptId={scriptId} />
    </Suspense>
  );
}
