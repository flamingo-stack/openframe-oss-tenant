import { useState, useEffect } from 'react'
import { debugLogService, DebugLog } from '../services/debugLogService'

export function useDebugLogs() {
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [isDebugVisible, setIsDebugVisible] = useState(false)

  useEffect(() => {
    // Load initial logs
    setLogs(debugLogService.getLogs())

    // Subscribe to updates
    const unsubscribe = debugLogService.subscribe((updatedLogs) => {
      setLogs(updatedLogs)
    })

    return unsubscribe
  }, [])

  const clearLogs = () => {
    debugLogService.clearLogs()
  }

  const toggleDebug = () => {
    setIsDebugVisible(prev => !prev)
  }

  return {
    logs,
    isDebugVisible,
    toggleDebug,
    clearLogs
  }
}

