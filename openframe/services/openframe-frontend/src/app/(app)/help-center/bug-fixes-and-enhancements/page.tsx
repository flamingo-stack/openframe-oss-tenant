'use client';

import { DeliveryPage } from '@flamingo-stack/openframe-frontend-core/components/help-center-pages';
import { EP, HELP_CENTER_BASE } from '../endpoints';

/**
 * Bug-fixes & Enhancements (delivery) — one-line mount of the lib's ready-made
 * `<DeliveryPage>` (chrome + search/task-type filter + the two self-fetching
 * completed/active tables). This page supplies only the two api routes.
 */
export default function BugFixesAndEnhancementsRoute() {
  return (
    <DeliveryPage
      shell={false}
      completedEndpoint={EP.deliveryCompleted}
      inProgressEndpoint={EP.deliveryInProgress}
      backButton={{ label: 'Back to Help Center', href: HELP_CENTER_BASE }}
    />
  );
}
