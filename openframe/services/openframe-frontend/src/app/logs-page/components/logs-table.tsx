'use client'

import { useEffect } from 'react'
import { useLogs } from '../hooks/use-logs'
import { Button } from '@flamingo/ui-kit/components/ui'

export function LogsTable() {
  const {
    logs,
    isLoading,
    error,
    hasNextPage,
    hasPreviousPage,
    fetchLogs,
    fetchNextPage,
    fetchPreviousPage,
    searchLogs
  } = useLogs()

  // Fetch logs on component mount
  useEffect(() => {
    fetchLogs()
  }, [])

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const searchTerm = formData.get('search') as string
    searchLogs(searchTerm)
  }

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-ods-text-secondary">Loading logs...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          name="search"
          type="text"
          placeholder="Search logs..."
          className="flex-1 px-3 py-2 border border-ods-border rounded-md bg-ods-bg-secondary text-ods-text-primary"
        />
        <Button type="submit">Search</Button>
      </form>


      {/* Logs List */}
      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-ods-text-secondary">
            No logs found
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.toolEventId}
              className="border border-ods-border rounded-lg p-4 bg-ods-bg-secondary"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.severity === 'ERROR' ? 'bg-red-100 text-red-800' :
                      log.severity === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                      log.severity === 'INFO' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.severity}
                    </span>
                    <span className="text-sm text-ods-text-secondary">
                      {log.toolType}
                    </span>
                    <span className="text-sm text-ods-text-secondary">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-ods-text-primary">{log.summary}</p>
                  {log.deviceId && (
                    <p className="text-sm text-ods-text-secondary mt-1">
                      Device: {log.deviceId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={fetchPreviousPage}
          disabled={!hasPreviousPage || isLoading}
        >
          Previous
        </Button>
        <span className="text-ods-text-secondary">
          {logs.length} logs loaded
        </span>
        <Button
          variant="outline"
          onClick={fetchNextPage}
          disabled={!hasNextPage || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  )
}