import type { Policy } from '../types/policies.types';
import type { PolicySummaryStats } from '../types/policy-summary.types';

const EMPTY_SUMMARY: PolicySummaryStats = {
  totalPolicies: 0,
  failingPolicies: 0,
  failingPoliciesPercentage: 0,
  compliantPolicies: 0,
  compliantPoliciesPercentage: 0,
  totalPassingEvaluations: 0,
  totalFailingEvaluations: 0,
  totalEvaluations: 0,
  complianceRate: 0,
  nonCompliantDevices: 0,
  totalAssignedDevices: 0,
  nonCompliantDevicesPercentage: 0,
  lastUpdatedAt: null,
};

/**
 * Compute policy compliance summary from a list of policies and optional
 * deduplicated host ID sets.
 *
 * @param policies - Array of policies (each includes passing/failing host counts)
 * @param nonCompliantHostIds - Unique host IDs that fail at least one policy
 * @param totalAssignedHostIds - Unique host IDs assigned to any policy
 */
export function computePolicySummary(
  policies: Policy[],
  nonCompliantHostIds?: Set<number>,
  totalAssignedHostIds?: Set<number>,
): PolicySummaryStats {
  const totalPolicies = policies.length;
  if (totalPolicies === 0) return EMPTY_SUMMARY;

  let failingPolicies = 0;
  let totalPassingEvaluations = 0;
  let totalFailingEvaluations = 0;
  let latestUpdate: string | null = null;

  for (const policy of policies) {
    if (policy.failing_host_count > 0) {
      failingPolicies++;
    }
    totalPassingEvaluations += policy.passing_host_count;
    totalFailingEvaluations += policy.failing_host_count;

    if (policy.host_count_updated_at && (!latestUpdate || policy.host_count_updated_at > latestUpdate)) {
      latestUpdate = policy.host_count_updated_at;
    }
  }

  const compliantPolicies = totalPolicies - failingPolicies;
  const totalEvaluations = totalPassingEvaluations + totalFailingEvaluations;

  const nonCompliantDevices = nonCompliantHostIds?.size ?? 0;
  const totalAssignedDevices = totalAssignedHostIds?.size ?? 0;

  return {
    totalPolicies,
    failingPolicies,
    failingPoliciesPercentage: Math.round((failingPolicies / totalPolicies) * 100),
    compliantPolicies,
    compliantPoliciesPercentage: Math.round((compliantPolicies / totalPolicies) * 100),
    totalPassingEvaluations,
    totalFailingEvaluations,
    totalEvaluations,
    complianceRate: totalEvaluations > 0 ? Math.round((totalPassingEvaluations / totalEvaluations) * 100) : 0,
    nonCompliantDevices,
    totalAssignedDevices,
    nonCompliantDevicesPercentage:
      totalAssignedDevices > 0 ? Math.round((nonCompliantDevices / totalAssignedDevices) * 100) : 0,
    lastUpdatedAt: latestUpdate,
  };
}
