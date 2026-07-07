'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import { RunScriptConfigStep } from './run-script-config-step';
import { RunScriptSelectStep } from './run-script-select-step';
import { RunScriptConfigStepSkeleton } from './run-script-skeletons';
import { ScriptRunningModal } from './script-running-modal';

interface RunScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Machine id of the device the script runs on (batchRunScript target). */
  machineId: string;
  /** Navigate to the device's logs (Overview tab) — the "Device Logs" CTA. */
  onViewDeviceLogs: () => void;
}

/**
 * "Run Script on device" modal (scripts-v2). Steps:
 *   1. Select Script — search + tag-filtered, infinite-scroll list of ACTIVE
 *      scripts (new GraphQL).
 *   2. Run Script — a mini run view: the selected script's details + overridable
 *      per-run variables (timeout, privilege, args, env), then `batchRunScript`
 *      to this one device.
 *   3. Scripts Running — post-run confirmation pointing to the device logs.
 */
export function RunScriptModal({ isOpen, onClose, machineId, onViewDeviceLogs }: RunScriptModalProps) {
  const [step, setStep] = useState<'select' | 'config'>('select');
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [ran, setRan] = useState(false);

  // Reset to the first step whenever the modal (re)opens.
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setScriptId(null);
      setRan(false);
    }
  }, [isOpen]);

  const handleSelect = useCallback((id: string) => {
    setScriptId(id);
    setStep('config');
  }, []);

  const handleBack = useCallback(() => setStep('select'), []);

  const handleViewDeviceLogs = useCallback(() => {
    setRan(false);
    onClose();
    onViewDeviceLogs();
  }, [onClose, onViewDeviceLogs]);

  return (
    <>
      <SimpleModal
        isOpen={isOpen && !ran}
        onClose={onClose}
        title={step === 'select' ? 'Select Script' : 'Run Script'}
        className="md:max-w-[680px] h-[90vh] max-h-[760px]"
        contentClassName="flex flex-col gap-[var(--spacing-system-l)]"
      >
        {step === 'select' || !scriptId ? (
          <RunScriptSelectStep onSelect={handleSelect} />
        ) : (
          <Suspense fallback={<RunScriptConfigStepSkeleton />}>
            <RunScriptConfigStep
              scriptId={scriptId}
              machineId={machineId}
              onBack={handleBack}
              onRan={() => setRan(true)}
            />
          </Suspense>
        )}
      </SimpleModal>

      <ScriptRunningModal isOpen={isOpen && ran} onClose={onClose} onViewDeviceLogs={handleViewDeviceLogs} />
    </>
  );
}
