export interface Query {
  id: number
  name: string
  query: string
  description: string
  author_id: number
  author_name: string
  author_email: string
  saved: boolean
  observer_can_run: boolean
  team_id?: number | null
  team_id_char?: string | null
  pack_id?: number | null
  interval: number
  platform?: string
  min_osquery_version?: string
  automations_enabled: boolean
  logging?: string
  discard_data?: boolean
  created_at: string
  updated_at: string
  software?: string
  last_executed?: string
  output_size?: string
}

export interface QueryReportResult {
  host_id: number
  host_name: string
  last_fetched: string
  columns: Record<string, string>
}

export interface QueryReportResponse {
  query_id: number
  report_clipped: boolean
  results: QueryReportResult[]
}

export interface QueryReportParams {
  order_key?: string
  order_direction?: 'asc' | 'desc'
}
