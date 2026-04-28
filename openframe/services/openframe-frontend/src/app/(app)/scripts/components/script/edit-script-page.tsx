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
  const { testRun, handleRunTest, handleStopRun, clearTestRun } = useTestRuns(form.getValues);

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

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
        disabled: isSubmitting,
        loading: isSubmitting,
      },
    ],
    [handleSave, isSubmitting],
  );

  if (isLoadingScript) {
    return <EditScriptSkeleton />;
  }

  if (scriptError && isEditMode) {
    return (
      <div className="min-h-screen bg-ods-bg p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-ods-error/20 border border-ods-error p-6">
            <h2 className="text-ods-error text-xl font-semibold mb-2">Error Loading Script</h2>
            <p className="text-ods-error">{scriptError}</p>
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
      {testRun && (
        <div>
          <Label className="text-h5 text-ods-text-primary">Script Testing</Label>
          <TestRunCard
            run={testRun}
            onStop={handleStopRun}
            onTestAgain={() => setIsTestModalOpen(true)}
            onClose={clearTestRun}
          />
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
