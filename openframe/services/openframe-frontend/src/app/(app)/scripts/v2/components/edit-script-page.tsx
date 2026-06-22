'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Suspense, useCallback, useMemo, useState } from 'react';
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
import { ALLOWED_SHELL_IDS, relayScriptToForm, shellToEnum } from '../utils/script-mappers';
import { EditScriptSkeleton } from './edit-script-skeleton';
import { type SelectedTestDevice, TestScriptModal } from './test-script-modal';

interface EditScriptFormProps {
  scriptId: string | null;
  initialValues: EditScriptFormData | null;
}

function EditScriptForm({ scriptId, initialValues }: EditScriptFormProps) {
  const isEditMode = Boolean(scriptId);
  const { toast } = useToast();
  const handleBackToList = useSafeBack('/scripts-v2');
  const handleBackToDetails = useSafeBack(`/scripts-v2/details/${scriptId}`);
  const backButton = useMemo(
    () => ({ label: 'Back', onClick: isEditMode ? handleBackToDetails : handleBackToList }),
    [isEditMode, handleBackToDetails, handleBackToList],
  );

  const { form, isSubmitting, handleSave } = useEditScriptForm({ scriptId, initialValues, isEditMode });

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testDispatched, setTestDispatched] = useState(false);
  const [commitRunCommand] = useMutation<RunCommandMutationType>(runCommandMutation);

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
    const values = form.getValues();
    const [shellOk, bodyOk] = await Promise.all([form.trigger('shell'), form.trigger('script_body')]);

    const missing: string[] = [];
    if (!shellOk) {
      missing.push('a shell type');
    }
    if (!bodyOk) {
      missing.push('script content');
    }
    if (values.supported_platforms.length === 0) {
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
            privilegeLevel: device.runAsUser ? 'USER' : 'ADMIN',
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
        onClick: handleSave,
        variant: 'accent' as const,
        disabled: isSubmitting,
        loading: isSubmitting,
      },
    ],
    [handleSave, isSubmitting, handleOpenTest],
  );

  return (
    <PageLayout
      title={isEditMode ? 'Edit Script' : 'New Script'}
      backButton={backButton}
      actions={actions}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <ScriptFormFields form={form} allowedShellIds={ALLOWED_SHELL_IDS} hideCategory hideRunAsUser />

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
  const data = useLazyLoadQuery<ScriptDetailQueryType>(
    scriptDetailRelayQuery,
    { id: scriptId },
    { fetchPolicy: 'store-and-network' },
  );

  const initialValues = useMemo(() => (data.script ? relayScriptToForm(data.script) : null), [data.script]);

  return <EditScriptForm scriptId={scriptId} initialValues={initialValues} />;
}

interface EditScriptPageProps {
  scriptId: string | null;
}

export function EditScriptPage({ scriptId }: EditScriptPageProps) {
  if (!scriptId) {
    return <EditScriptForm scriptId={null} initialValues={null} />;
  }

  return (
    <Suspense fallback={<EditScriptSkeleton />}>
      <EditScriptLoader scriptId={scriptId} />
    </Suspense>
  );
}
