import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatTime } from '@/lib/format-date';
import type { TestRunData } from '../components/script/test-run-card';
import type { SelectedTestDevice } from '../components/script/test-script-modal';
import { rejectScriptsMigrationPending } from '../lib/scripts-migration';
import type { EditScriptFormData } from '../types/edit-script.types';

let runIdCounter = 0;

export function useTestRuns(getFormValues: () => EditScriptFormData) {
  const { toast } = useToast();
  const [testRun, setTestRun] = useState<TestRunData | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (startTime: number) => {
      stopTimer();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTestRun(prev => (prev?.status === 'running' ? { ...prev, elapsedSeconds: elapsed } : prev));
      }, 1000);
    },
    [stopTimer],
  );

  const handleStopRun = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    stopTimer();
    setTestRun(prev =>
      prev
        ? {
            ...prev,
            status: 'aborted',
            output: [...prev.output, 'Script execution aborted by user.'],
          }
        : prev,
    );
  }, [stopTimer]);

  const handleRunTest = useCallback(
    async (device: SelectedTestDevice) => {
      // Abort previous run if still in progress
      abortControllerRef.current?.abort();
      stopTimer();

      const runId = `run-${++runIdCounter}`;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const formValues = getFormValues();
      const startTime = Date.now();
      const newRun: TestRunData = {
        id: runId,
        deviceName: device.deviceName,
        agentToolId: device.agentToolId,
        startedAt: formatTime(startTime),
        startTime,
        status: 'running',
        output: ['Starting script execution...'],
        elapsedSeconds: 0,
      };

      setTestRun(newRun);
      startTimer(startTime);

      try {
        // TODO(openframe-rmm): Tactical RMM removed — test-run execution has no backend
        // until the OpenFrame RMM scripts API is wired up. Reject so the catch below shows
        // a clear "migration pending" error in the run output + toast. Keep `formValues`
        // referenced so the (frozen) UI still validates. See scripts-migration.ts.
        void formValues;
        if (controller.signal.aborted) return;
        rejectScriptsMigrationPending();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;

        stopTimer();
        abortControllerRef.current = null;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const errorMsg = err instanceof Error ? err.message : 'Script execution failed';

        setTestRun(prev =>
          prev?.id === runId
            ? {
                ...prev,
                elapsedSeconds: elapsed,
                status: 'error',
                output: [...prev.output, `Error: ${errorMsg}`],
              }
            : prev,
        );

        toast({
          title: 'Test Failed',
          description: `${device.deviceName}: ${errorMsg}`,
          variant: 'destructive',
        });
      }
    },
    [getFormValues, toast, startTimer, stopTimer],
  );

  const clearTestRun = useCallback(() => {
    setTestRun(null);
  }, []);

  return { testRun, handleRunTest, handleStopRun, clearTestRun };
}
