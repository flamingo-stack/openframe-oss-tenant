export interface Query {
  id: number;
  name: string;
  query: string;
  description: string;
  author_id: number;
  author_name: string;
  author_email: string;
  saved: boolean;
  observer_can_run: boolean;
  team_id?: number | null;
  team_id_char?: string | null;
  pack_id?: number | null;
  interval: number;
  platform?: string;
  min_osquery_version?: string;
  automations_enabled: boolean;
  logging?: string;
  discard_data?: boolean;
  created_at: string;
  updated_at: string;
  software?: string;
  last_executed?: string;
  output_size?: string;
}

export interface QueryReportResult {
  host_id: number;
  host_name: string;
  last_fetched: string;
  columns: Record<string, string>;
}

/**
 * One entry from `GET /fleet/hosts/{id}/queries` — a per-host query report. This is the
 * only endpoint that filters queries by host id; `report_id` is the query's id. It carries
 * the host's last collection + result count but NOT the query's `interval` (frequency lives
 * on the global query and must be joined in by id).
 */
export interface HostQueryReport {
  report_id: number;
  name: string;
  description: string;
  last_fetched: string | null;
  first_result: Record<string, string> | null;
  n_host_results: number;
  report_clipped: boolean;
  store_results: boolean;
}

export interface HostQueriesResponse {
  reports: HostQueryReport[];
  count: number;
  meta: { has_next_results: boolean; has_previous_results: boolean };
}

export interface QueryReportResponse {
  query_id: number;
  report_clipped: boolean;
  results: QueryReportResult[];
}

export interface QueryReportParams {
  order_key?: string;
  order_direction?: 'asc' | 'desc';
}
