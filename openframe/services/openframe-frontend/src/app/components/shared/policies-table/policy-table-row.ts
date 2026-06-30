import type { MoreActionsMenu } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ComponentProps } from 'react';

/** A single ellipsis-menu action, as accepted by the core `MoreActionsMenu`. */
export type PolicyTableAction = ComponentProps<typeof MoreActionsMenu>['items'][number];

export type PolicyStatusVariant = 'success' | 'error' | 'warning' | 'critical' | 'grey';

export interface PolicyTableStatus {
  label: string;
  variant: PolicyStatusVariant;
  /** Optional secondary line under the status tag (e.g. "3 devices"). */
  note?: { text: string; tone: 'error' | 'warning' };
}

/**
 * Normalized row consumed by the shared `PoliciesTable`. Each caller maps its
 * own policy model (fleet-wide `Policy`, per-device Fleet host policy, …) into
 * this view-model so the table/columns live in a single place.
 */
export interface PolicyTableRow {
  /** Stable row id. */
  id: string;
  name: string;
  description?: string;
  /** Critical severity — drives sorting and the default severity label. */
  critical: boolean;
  /** Display text for the SEVERITY column ("Critical" / "Low" / "Non-critical"). */
  severityLabel: string;
  status: PolicyTableStatus;
  /** OS platforms — only rendered when the table shows the Platform column. */
  platforms?: string[];
  /** Optional ellipsis-menu actions for the row. */
  actions?: PolicyTableAction[];
  /** Target for the open-in-new-tab button and (optionally) the row link. */
  href?: string;
}
