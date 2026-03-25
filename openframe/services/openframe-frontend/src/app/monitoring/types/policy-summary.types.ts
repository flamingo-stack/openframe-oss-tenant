export interface PolicySummaryStats {
  /** Total number of policies */
  totalPolicies: number;

  /** Number of policies with at least one failing host */
  failingPolicies: number;

  /** Percentage of policies that are failing */
  failingPoliciesPercentage: number;

  /** Number of policies where all assigned hosts pass */
  compliantPolicies: number;

  /** Percentage of policies that are fully compliant */
  compliantPoliciesPercentage: number;

  /** Sum of passing_host_count across all policies */
  totalPassingEvaluations: number;

  /** Sum of failing_host_count across all policies */
  totalFailingEvaluations: number;

  /** Total evaluations (passing + failing) */
  totalEvaluations: number;

  /** Overall compliance rate: passing / total evaluations * 100 */
  complianceRate: number;

  /** Unique hosts failing at least one policy */
  nonCompliantDevices: number;

  /** Unique hosts assigned to any policy */
  totalAssignedDevices: number;

  /** Percentage of non-compliant devices out of total assigned */
  nonCompliantDevicesPercentage: number;

  /** Most recent host_count_updated_at across all policies */
  lastUpdatedAt: string | null;
}
