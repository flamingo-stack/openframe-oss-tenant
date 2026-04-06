import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { tacticalApiClient } from '@/lib/tactical-api-client';

import type { TestRunData } from '../components/script/test-run-card';
import type { SelectedTestDevice } from '../components/script/test-script-modal';
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
        startedAt: new Date(startTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        startTime,
        status: 'running',
        output: ['Starting script execution...'],
        elapsedSeconds: 0,
      };

      setTestRun(newRun);
      startTimer(startTime);

      try {
        const response = await tacticalApiClient.post(
          `/scripts/${device.agentToolId}/test/`,
          {
            shell: formValues.shell,
            code: formValues.script_body,
            timeout: formValues.default_timeout,
            run_as_user: formValues.run_as_user,
            args: formValues.args.filter(a => a.key.trim() !== '').map(a => (a.value ? `${a.key} ${a.value}` : a.key)),
            env_vars: formValues.env_vars.filter(e => e.key.trim() !== '').map(e => `${e.key}=${e.value}`),
          },
          { signal: controller.signal },
        );

        if (controller.signal.aborted) return;

        stopTimer();
        abortControllerRef.current = null;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);

        if (!response.ok) {
          throw new Error(response.error || 'Script execution failed');
        }

        const outputLines: string[] = [];
        const result = response.data;

        if (typeof result === 'string') {
          outputLines.push(...result.split('\n'));
        } else if (Array.isArray(result)) {
          outputLines.push(...result.map(String));
        } else if (result && typeof result === 'object') {
          if (result.retcode !== undefined) {
            outputLines.push(`Exit code: ${result.retcode}`);
          }
          if (result.stdout) {
            outputLines.push(...String(result.stdout).split('\n'));
          }
          if (result.stderr) {
            outputLines.push(...String(result.stderr).split('\n'));
          }
          if (!result.stdout && !result.stderr && !result.retcode) {
            outputLines.push(JSON.stringify(result, null, 2));
          }
        }

        if (outputLines.length === 0) {
          outputLines.push('Script completed with no output.');
        }

        setTestRun(prev =>
          prev?.id === runId
            ? {
                ...prev,
                elapsedSeconds: elapsed,
                status: 'completed',
                output: outputLines,
              }
            : prev,
        );

        toast({
          title: 'Test Complete',
          description: `${device.deviceName}: Script executed successfully`,
          variant: 'success',
        });
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
