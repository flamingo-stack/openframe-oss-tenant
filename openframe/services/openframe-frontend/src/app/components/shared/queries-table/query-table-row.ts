import type { MoreActionsMenu } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ComponentProps } from 'react';

/** A single ellipsis-menu action, as accepted by the core `MoreActionsMenu`. */
export type QueryTableAction = ComponentProps<typeof MoreActionsMenu>['items'][number];

/**
 * Normalized row consumed by the shared `QueriesTable`. Each caller maps its own
 * query model into this view-model so the table/columns live in a single place.
 */
export interface QueryTableRow {
  /** Stable row id. */
  id: string;
  name: string;
  description?: string;
  /** Display text for the FREQUENCY column (e.g. "Every 1h"). */
  frequencyLabel: string;
  /** Optional ellipsis-menu actions for the row. */
  actions?: QueryTableAction[];
  /** Target for the open-in-new-tab button and (optionally) the row link. */
  href?: string;
}
