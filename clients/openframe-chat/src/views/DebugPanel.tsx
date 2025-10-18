import { useState } from 'react'
import { useDebugLogs } from '../hooks/useDebugLogs'
import { DebugLog } from '../services/debugLogService'

export function DebugPanel() {
  const { logs, isDebugVisible, toggleDebug, clearLogs } = useDebugLogs()
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  if (!isDebugVisible) {
    return (
      <button
        onClick={toggleDebug}
        className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded shadow-lg transition-colors"
      >
        Show Debug ({logs.length})
      </button>
    )
  }

  const toggleExpand = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId)
  }

  const getStatusColor = (log: DebugLog) => {
    if (log.error) return 'text-red-400'
    if (!log.status) return 'text-yellow-400'
    if (log.status >= 200 && log.status < 300) return 'text-green-400'
    if (log.status >= 400) return 'text-red-400'
    return 'text-gray-400'
  }

  return (
    <div className="fixed bottom-0 right-0 z-50 w-full md:w-2/3 lg:w-1/2 h-2/3 bg-gray-900 border-l border-t border-gray-700 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold text-sm">Debug Logs</h3>
          <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
            {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearLogs}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
          >
            Clear
          </button>
          <button
            onClick={toggleDebug}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
          >
            Hide
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs font-mono debug-panel-scrollbar">
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No logs yet. Make a request to see debug information.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="bg-gray-800 rounded border border-gray-700 overflow-hidden"
            >
              {/* Log Header */}
              <div
                onClick={() => toggleExpand(log.id)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-750 transition-colors flex items-start justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-400 font-semibold">
                      {log.method}
                    </span>
                    <span className={getStatusColor(log)}>
                      {log.error ? '❌ ERROR' : log.status ? `${log.status} ${log.statusText}` : '⏳ Pending...'}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-400 truncate">
                    {log.url}
                  </div>
                </div>
                <div className="ml-2 text-gray-500">
                  {expandedLog === log.id ? '▼' : '▶'}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedLog === log.id && (
                <div className="px-3 py-2 border-t border-gray-700 bg-gray-850 space-y-2">
                  <div>
                    <div className="text-gray-500 mb-1">URL:</div>
                    <div className="text-blue-300 break-all">{log.url}</div>
                  </div>

                  <div>
                    <div className="text-gray-500 mb-1">Origin:</div>
                    <div className="text-gray-300">{log.origin}</div>
                  </div>

                  {log.authToken && (
                    <div>
                      <div className="text-gray-500 mb-1">Auth Token:</div>
                      <div className="text-yellow-300 break-all">{log.authToken}</div>
                    </div>
                  )}

                  {log.requestBody && (
                    <div>
                      <div className="text-gray-500 mb-1">Request Body:</div>
                      <pre className="text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto">
                        {log.requestBody}
                      </pre>
                    </div>
                  )}

                  {log.status && (
                    <div>
                      <div className="text-gray-500 mb-1">Response Status:</div>
                      <div className={getStatusColor(log)}>
                        {log.status} {log.statusText}
                      </div>
                    </div>
                  )}

                  {log.responseBody && (
                    <div>
                      <div className="text-gray-500 mb-1">Response Body:</div>
                      <pre className="text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto max-h-64 debug-panel-scrollbar">
                        {log.responseBody}
                      </pre>
                    </div>
                  )}

                  {log.error && (
                    <div>
                      <div className="text-gray-500 mb-1">Error:</div>
                      <div className="text-red-400 break-all">{log.error}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

