'use client';

import { DeliveryLists, DevSectionPage } from '@flamingo-stack/openframe-frontend-core/components';
import { EP, HELP_CENTER_BASE } from '../endpoints';

export const dynamic = 'force-dynamic';

/**
 * Bug-fixes & Enhancements (delivery) — config-only. `<DevSectionPage
 * sectionKey="delivery">` supplies the chrome (hero + search + task-type
 * filter); `<DeliveryLists>` reads `search` / `task_type` and renders the
 * completed + active tables. This page supplies only the two api routes.
 */
export default function BugFixesAndEnhancementsPage() {
  return (
    <DevSectionPage sectionKey="delivery" backButton={{ label: 'Back to Help Center', href: HELP_CENTER_BASE }}>
      <DeliveryLists completedApiEndpoint={EP.deliveryCompleted} inProgressApiEndpoint={EP.deliveryInProgress} />
    </DevSectionPage>
  );
}
