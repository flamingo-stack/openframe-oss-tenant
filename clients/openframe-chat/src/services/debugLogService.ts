export interface DebugLog {
  id: string
  timestamp: string
  url: string
  origin: string
  method: string
  status?: number
  statusText?: string
  responseBody?: string
  authToken?: string
  requestBody?: string
  error?: string
}

type LogListener = (logs: DebugLog[]) => void

class DebugLogService {
  private logs: DebugLog[] = []
  private listeners: Set<LogListener> = new Set()
  private maxLogs = 100

  addLog(log: Omit<DebugLog, 'id' | 'timestamp'>) {
    const newLog: DebugLog = {
      ...log,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString()
    }

    this.logs = [newLog, ...this.logs].slice(0, this.maxLogs)
    this.notifyListeners()
  }

  getLogs(): DebugLog[] {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
    this.notifyListeners()
  }

  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getLogs()))
  }

  logRequest(options: {
    url: string
    method: string
    authToken?: string
    requestBody?: any
  }) {
    this.addLog({
      url: options.url,
      origin: window.location.origin,
      method: options.method,
      authToken: options.authToken ? `${options.authToken.substring(0, 20)}...` : undefined,
      requestBody: options.requestBody ? JSON.stringify(options.requestBody, null, 2) : undefined
    })
  }

  logResponse(options: {
    url: string
    method: string
    status: number
    statusText: string
    responseBody?: string
    authToken?: string
  }) {
    // Find the most recent log for this URL and update it
    const logIndex = this.logs.findIndex(log => 
      log.url === options.url && 
      log.method === options.method && 
      !log.status
    )

    if (logIndex !== -1) {
      this.logs[logIndex] = {
        ...this.logs[logIndex],
        status: options.status,
        statusText: options.statusText,
        responseBody: options.responseBody,
        authToken: options.authToken ? `${options.authToken.substring(0, 20)}...` : this.logs[logIndex].authToken
      }
      this.notifyListeners()
    } else {
      // If no matching request log found, create a new one
      this.addLog({
        url: options.url,
        origin: window.location.origin,
        method: options.method,
        status: options.status,
        statusText: options.statusText,
        responseBody: options.responseBody,
        authToken: options.authToken ? `${options.authToken.substring(0, 20)}...` : undefined
      })
    }
  }

  logError(options: {
    url: string
    method: string
    error: string
    authToken?: string
  }) {
    // Find the most recent log for this URL and update it
    const logIndex = this.logs.findIndex(log => 
      log.url === options.url && 
      log.method === options.method && 
      !log.status && 
      !log.error
    )

    if (logIndex !== -1) {
      this.logs[logIndex] = {
        ...this.logs[logIndex],
        error: options.error,
        authToken: options.authToken ? `${options.authToken.substring(0, 20)}...` : this.logs[logIndex].authToken
      }
      this.notifyListeners()
    } else {
      // If no matching request log found, create a new one
      this.addLog({
        url: options.url,
        origin: window.location.origin,
        method: options.method,
        error: options.error,
        authToken: options.authToken ? `${options.authToken.substring(0, 20)}...` : undefined
      })
    }
  }
}

export const debugLogService = new DebugLogService()

