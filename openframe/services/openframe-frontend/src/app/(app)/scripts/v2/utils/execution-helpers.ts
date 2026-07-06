// Value import: the generated module exports each enum as both a `const` and a
// `type` under the same name, so these stand in for hardcoded literals.
import { PrivilegeLevel, ScriptExecutionStatus } from '@/generated/schema-enums';
import { formatDate, formatTime } from '@/lib/format-date';

/** "date, time" in the user's local format (e.g. "6/26/26, 2:31 PM"). */
export function formatExecutionTimestamp(input: string | number | Date | null | undefined): string {
  if (!input) return '—';
  const date = new Date(input);
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/**
 * Presentation helpers for script executions — shared by the Execution History
 * table and the single-execution details page so labels/variants stay in sync.
 */

export type TagVariant = 'success' | 'error' | 'warning' | 'grey';

/** Human label for an execution status (design: SUCCESS reads as "Completed"). */
export function executionStatusLabel(status: ScriptExecutionStatus | string | null | undefined): string {
  switch (status) {
    case ScriptExecutionStatus.SUCCESS:
      return 'Completed';
    case ScriptExecutionStatus.FAILED:
      return 'Failed';
    case ScriptExecutionStatus.RUNNING:
      return 'Running';
    default:
      return status ? String(status) : '—';
  }
}

/** Tag color variant for an execution status. */
export function executionStatusVariant(status: ScriptExecutionStatus | string | null | undefined): TagVariant {
  switch (status) {
    case ScriptExecutionStatus.SUCCESS:
      return 'success';
    case ScriptExecutionStatus.FAILED:
      return 'error';
    case ScriptExecutionStatus.RUNNING:
      return 'warning';
    default:
      return 'grey';
  }
}

/** Privilege level label (ADMIN runs elevated as the system account). */
export function privilegeLevelLabel(level: PrivilegeLevel | string | null | undefined): string {
  switch (level) {
    case PrivilegeLevel.ADMIN:
      return 'System';
    case PrivilegeLevel.USER:
      return 'User';
    default:
      return level ? String(level) : '—';
  }
}

interface MachineLike {
  machineId?: string | null;
  hostname?: string | null;
  displayName?: string | null;
  organization?: { name?: string | null } | null;
}

/** Best display name for a machine (displayName → hostname → machineId). */
export function machineLabel(machine: MachineLike | null | undefined): string {
  return machine?.displayName || machine?.hostname || machine?.machineId || '—';
}

/** Organization name for a machine, or empty string. */
export function organizationLabel(machine: MachineLike | null | undefined): string {
  return machine?.organization?.name ?? '';
}

interface InitiatorLike {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

/** Full name of an execution initiator (falls back to email, then "Unknown"). */
export function initiatorName(user: InitiatorLike | null | undefined): string {
  if (!user) return 'Unknown';
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || user.email || 'Unknown';
}

/** Up-to-two-letter initials for an initiator avatar fallback. */
export function initiatorInitials(user: InitiatorLike | null | undefined): string {
  if (!user) return 'UN';
  const first = user.firstName?.trim()?.[0];
  const last = user.lastName?.trim()?.[0];
  if (first || last) return `${first ?? ''}${last ?? ''}`.toUpperCase();
  return (user.email?.trim()?.slice(0, 2) || 'UN').toUpperCase();
}

interface ExecutionResultLike {
  stdout?: string | null;
  stderr?: string | null;
  error?: string | null;
}

/** Combined result text shown in the table / details (stdout → stderr → error). */
export function executionResultText(node: ExecutionResultLike | null | undefined): string {
  return node?.stdout || node?.stderr || node?.error || '';
}
