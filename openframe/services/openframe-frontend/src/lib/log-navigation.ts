/**
 * Log Navigation Utility
 * Centralized function for navigating to log details page
 */

/**
 * Navigate to log details page with proper parameter handling
 *
 * @param router - Next.js router instance
 * @param log - Log entry (can be from UI-Kit LogEntry or have originalLogEntry field)
 *
 * @example
 * // From dashboard with UI-Kit LogEntry
 * navigateToLogDetails(router, log)
 *
 * // From logs table with originalLogEntry
 * navigateToLogDetails(router, transformedLog)
 */
export function navigateToLogDetails(router: any, log: any): void {
  // Extract from originalLogEntry if available (logs-table pattern)
  // Otherwise use the log directly (dashboard pattern)
  const original = log.originalLogEntry || log

  // Get log ID (can be either 'id' or 'toolEventId')
  const id = log.id || log.toolEventId

  // Extract required parameters from original/raw log entry
  const ingestDay = original.ingestDay
  const toolType = original.toolType      // Raw DB value (e.g., "tacticalrmm")
  const eventType = original.eventType
  const timestamp = original.timestamp

  // Build URL with all required parameters
  const url = `/log-details?id=${id}` +
    `&ingestDay=${ingestDay}` +
    `&toolType=${toolType}` +
    `&eventType=${eventType}` +
    `&timestamp=${encodeURIComponent(timestamp || '')}`

  router.push(url)
}
