'use client';

import { HelpCenterList } from '@flamingo-stack/openframe-frontend-core/components/tickets';
import { HELP_CENTER_BASE } from '../endpoints';

/**
 * Tickets / Help Center — `<HelpCenterList>` composes its own DevSectionPage
 * chrome (PageShell + PageLayout) + create form + ticket list, and identifies
 * the customer via the ChatRuntime. We pass `backButton` so its chrome's back
 * link points at the Help Center hub (its default is `/`).
 *
 * Its hooks already ride `embedAuthedFetch` but call bare
 * `/api/chat/agent/{find-ticket,ticket-action,list-engagements}`, which
 * `next.config.mjs` rewrites to the gateway's `/content/api/chat/agent/*`.
 */
export default function TicketsPage() {
  return (
    <HelpCenterList
      title="Support Tickets"
      shell={false}
      backButton={{ label: 'Back to Help Center', href: HELP_CENTER_BASE }}
    />
  );
}
