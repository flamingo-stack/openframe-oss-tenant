import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { tacticalApiClient } from '@lib/tactical-api-client'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { TestRunData } from '../components/test-run-card'
import type { SelectedTestDevice } from '../components/test-script-modal'
import type { EditScriptFormData } from '../types/edit-script.types'

let runIdCounter = 0

export function useTestRuns(getFormValues: () => EditScriptFormData) {
  const { toast } = useToast()
  const [testRuns, setTestRuns] = useState<TestRunData[]>([])
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(c => c.abort())
      timersRef.current.forEach(t => clearInterval(t))
      abortControllersRef.current.clear()
      timersRef.current.clear()
    }
  }, [])

  const stopRunTimer = useCallback((runId: string) => {
    const timer = timersRef.current.get(runId)
    if (timer) {
      clearInterval(timer)
      timersRef.current.delete(runId)
    }
  }, [])

  const startRunTimer = useCallback((runId: string, startTime: number) => {
    stopRunTimer(runId)
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setTestRuns(prev => prev.map(r =>
        r.id === runId && r.status === 'running' ? { ...r, elapsedSeconds: elapsed } : r
      ))
    }, 1000)
    timersRef.current.set(runId, timer)
  }, [stopRunTimer])

  const handleStopRun = useCallback((runId: string) => {
    abortControllersRef.current.get(runId)?.abort()
    abortControllersRef.current.delete(runId)
    stopRunTimer(runId)
    setTestRuns(prev => prev.map(r =>
      r.id === runId ? { ...r, status: 'aborted', output: [...r.output, 'Script execution aborted by user.'] } : r
    ))
  }, [stopRunTimer])

  const handleRunTest = useCallback(async (device: SelectedTestDevice) => {
    const runId = `run-${++runIdCounter}`
    const controller = new AbortController()
    abortControllersRef.current.set(runId, controller)

    const formValues = getFormValues()
    const startTime = Date.now()
    const newRun: TestRunData = {
      id: runId,
      deviceName: device.deviceName,
      agentToolId: device.agentToolId,
      startedAt: new Date(startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      startTime,
      status: 'running',
      output: ['Starting script execution...'],
      elapsedSeconds: 0
    }

    setTestRuns(prev => [...prev, newRun])
    startRunTimer(runId, startTime)

    try {
      const response = await tacticalApiClient.post(
        `/scripts/${device.agentToolId}/test/`,
        {
          shell: formValues.shell,
          code: formValues.script_body,
          timeout: formValues.default_timeout,
          run_as_user: formValues.run_as_user,
          args: formValues.args.filter(a => a.key.trim() !== '').map(a => a.value ? `${a.key}=${a.value}` : a.key),
          env_vars: formValues.env_vars.filter(e => e.key.trim() !== '').map(e => `${e.key}=${e.value}`)
        },
        { signal: controller.signal }
      )

      if (controller.signal.aborted) return

      stopRunTimer(runId)
      abortControllersRef.current.delete(runId)
      const elapsed = Math.floor((Date.now() - startTime) / 1000)

      if (!response.ok) {
        throw new Error(response.error || 'Script execution failed')
      }

      const outputLines: string[] = []
      const result = response.data

      if (typeof result === 'string') {
        outputLines.push(...result.split('\n'))
      } else if (Array.isArray(result)) {
        outputLines.push(...result.map(String))
      } else if (result && typeof result === 'object') {
        if (result.retcode !== undefined) {
          outputLines.push(`Exit code: ${result.retcode}`)
        }
        if (result.stdout) {
          outputLines.push(...String(result.stdout).split('\n'))
        }
        if (result.stderr) {
          outputLines.push(...String(result.stderr).split('\n'))
        }
        if (!result.stdout && !result.stderr && !result.retcode) {
          outputLines.push(JSON.stringify(result, null, 2))
        }
      }

      if (outputLines.length === 0) {
        outputLines.push('Script completed with no output.')
      }

      setTestRuns(prev => prev.map(r =>
        r.id === runId ? { ...r, elapsedSeconds: elapsed, status: 'completed', output: outputLines } : r
      ))

      toast({ title: 'Test Complete', description: `${device.deviceName}: Script executed successfully`, variant: 'success' })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return

      stopRunTimer(runId)
      abortControllersRef.current.delete(runId)
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const errorMsg = err instanceof Error ? err.message : 'Script execution failed'

      setTestRuns(prev => prev.map(r =>
        r.id === runId ? { ...r, elapsedSeconds: elapsed, status: 'error', output: [...r.output, `Error: ${errorMsg}`] } : r
      ))

      toast({ title: 'Test Failed', description: `${device.deviceName}: ${errorMsg}`, variant: 'destructive' })
    }
  }, [getFormValues, toast, startRunTimer, stopRunTimer])

  return { testRuns, handleRunTest, handleStopRun }
}
