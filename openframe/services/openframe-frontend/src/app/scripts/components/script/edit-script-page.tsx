'use client';

import { Button, FormPageContainer, Label } from '@flamingo-stack/openframe-frontend-core';
import { Card } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useEditScriptForm } from '../../hooks/use-edit-script-form';
import { useScriptDetails } from '../../hooks/use-script-details';
import { useTestRuns } from '../../hooks/use-test-runs';
import { EditScriptSkeleton } from './edit-script-skeleton';
import { ScriptFormFields } from './script-form-fields';
import { TestRunCard } from './test-run-card';
import { type SelectedTestDevice, TestScriptModal } from './test-script-modal';

interface EditScriptPageProps {
  scriptId: string | null;
}

export function EditScriptPage({ scriptId }: EditScriptPageProps) {
  const router = useRouter();
  const isEditMode = Boolean(scriptId);
  const backButton = useMemo(
    () =>
      isEditMode
        ? { label: 'Back to Script Details', onClick: () => router.push(`/scripts/details/${scriptId}`) }
        : { label: 'Back to Scripts', onClick: () => router.push('/scripts') },
    [isEditMode, scriptId, router],
  );

  const { scriptDetails, isLoading: isLoadingScript, error: scriptError } = useScriptDetails(scriptId || '');
  const { form, isSubmitting, handleSave } = useEditScriptForm({ scriptId, scriptDetails, isEditMode });
  const { testRuns, handleRunTest, handleStopRun } = useTestRuns(form.getValues);

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const watchedName = form.watch('name');
  const watchedSupportedPlatforms = form.watch('supported_platforms');

  const handleBack = useCallback(() => {
    router.push('/scripts');
  }, [router]);

  const handleDeviceSelected = useCallback(
    (device: SelectedTestDevice) => {
      handleRunTest(device);
    },
    [handleRunTest],
  );

  const actions = useMemo(
    () => [
      {
        label: 'Test Script',
        onClick: () => setIsTestModalOpen(true),
        variant: 'outline' as const,
      },
      {
        label: 'Save Script',
        onClick: handleSave,
        variant: 'primary' as const,
        disabled: isSubmitting || !watchedName.trim(),
        loading: isSubmitting,
      },
    ],
    [handleSave, isSubmitting, watchedName],
  );

  if (isLoadingScript) {
    return <EditScriptSkeleton />;
  }

  if (scriptError && isEditMode) {
    return (
      <div className="min-h-screen bg-ods-bg p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-error/20 border border-error p-6">
            <h2 className="text-error text-xl font-semibold mb-2">Error Loading Script</h2>
            <p className="text-error">{scriptError}</p>
            <Button onClick={handleBack} variant="destructive" className="mt-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Scripts
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <FormPageContainer
      title={isEditMode && scriptDetails ? 'Edit Script' : 'New Script'}
      backButton={backButton}
      actions={actions}
      padding="none"
    >
      {testRuns.length > 0 && (
        <div>
          <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Test Output</Label>
          <div className="flex flex-col gap-3">
            {testRuns.map(run => (
              <TestRunCard key={run.id} run={run} onStop={handleStopRun} />
            ))}
          </div>
        </div>
      )}
      <ScriptFormFields form={form} />

      <TestScriptModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onDeviceSelected={handleDeviceSelected}
        supportedPlatforms={watchedSupportedPlatforms}
      />
    </FormPageContainer>
  );
}
