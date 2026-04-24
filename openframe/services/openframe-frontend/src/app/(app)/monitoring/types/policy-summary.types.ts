export interface PolicySummaryStats {
  totalPolicies: number;
  failingPolicies: number;
  failingPoliciesPercentage: number;
  compliantPolicies: number;
  compliantPoliciesPercentage: number;
  lastUpdatedAt: string | null;
}
