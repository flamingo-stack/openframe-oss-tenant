import type { Policy } from '../types/policies.types';
import type { PolicySummaryStats } from '../types/policy-summary.types';

export type PolicyStatus = 'compliant' | 'failing' | 'pending' | 'partial';

export const POLICY_STATUS_CONFIG: Record<PolicyStatus, { label: string; variant: 'success' | 'error' | 'warning' }> = {
  compliant: { label: 'Compliant', variant: 'success' },
  failing: { label: 'Failing', variant: 'error' },
  pending: { label: 'Pending', variant: 'warning' },
  partial: { label: 'Partial', variant: 'warning' },
};

export function getPolicyStatus(policy: Policy): PolicyStatus {
  const failing = policy.failing_host_count;
  const responded = policy.passing_host_count + failing;
  const missing = (policy.hosts_include_any?.length ?? 0) - responded;

  if (missing > 0 && responded === 0) return 'pending';
  if (missing > 0) return 'partial';
  if (failing > 0) return 'failing';
  return 'compliant';
}

const EMPTY_SUMMARY: PolicySummaryStats = {
  totalPolicies: 0,
  failingPolicies: 0,
  failingPoliciesPercentage: 0,
  compliantPolicies: 0,
  compliantPoliciesPercentage: 0,
  lastUpdatedAt: null,
};

/**
 * Compute policy compliance summary from a list of policies.
 * Only policies with a definitive status (compliant or failing) are included
 * in compliance stats. Pending and partial policies are excluded.
 */
export function computePolicySummary(policies: Policy[]): PolicySummaryStats {
  const totalPolicies = policies.length;
  if (totalPolicies === 0) return EMPTY_SUMMARY;

  let failingPolicies = 0;
  let compliantPolicies = 0;
  let latestUpdate: string | null = null;

  for (const policy of policies) {
    const status = getPolicyStatus(policy);

    if (status === 'compliant') {
      compliantPolicies++;
    } else if (status === 'failing') {
      failingPolicies++;
    }

    if (policy.host_count_updated_at && (!latestUpdate || policy.host_count_updated_at > latestUpdate)) {
      latestUpdate = policy.host_count_updated_at;
    }
  }

  const resolvedPolicies = compliantPolicies + failingPolicies;

  return {
    totalPolicies,
    failingPolicies,
    failingPoliciesPercentage: resolvedPolicies > 0 ? Math.round((failingPolicies / resolvedPolicies) * 100) : 0,
    compliantPolicies,
    compliantPoliciesPercentage: resolvedPolicies > 0 ? Math.round((compliantPolicies / resolvedPolicies) * 100) : 0,
    lastUpdatedAt: latestUpdate,
  };
}
