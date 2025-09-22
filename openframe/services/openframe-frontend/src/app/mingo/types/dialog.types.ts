export interface Dialog {
  id: string
  topic: string
  source: string
  slaCountdown: string
  status: 'TECH_REQUIRED' | 'ON_HOLD' | 'ACTIVE' | 'RESOLVED'
  createdAt: string
  updatedAt: string
  archived: boolean
}

export interface DialogsResponse {
  dialogs: Dialog[]
  total: number
}

export interface DialogFilters {
  status?: string[]
  source?: string[]
}