export interface Policy {
  id: number
  name: string
  query: string
  category?: string
  enabled?: boolean
  critical: boolean
  description: string
  author_id: number
  author_name: string
  author_email: string
  team_id?: number
  resolution: string
  platform: string
  calendar_events_enabled: boolean
  created_at: string
  updated_at: string
  passing_host_count: number
  failing_host_count: number
  host_count_updated_at?: string
}

export interface PolicyFilters {
  status?: string[]
  source?: string[]
}
