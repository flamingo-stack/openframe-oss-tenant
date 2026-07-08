/**
 * Onboarding coach-marks — the little "Here's your Devices" popup that appears on a
 * destination page ONLY when the user got there from an onboarding step (e.g. clicked
 * "Go to Devices", or was redirected after creating a customer).
 *
 * The "came from onboarding" signal is a URL query param (`setupHint`) added by the
 * onboarding action. A normal visit to the page has no param → no popup. `setupReturn`
 * carries where the "Continue …" button goes back to (the onboarding surface the user
 * came from); the button label/icon are derived from that path (the tenant "Initial
 * Setup" on the dashboard vs the user "Onboarding" at /onboarding). Both params are
 * stripped once the popup is dismissed.
 */

export const SETUP_HINT_PARAM = 'setupHint';
export const SETUP_RETURN_PARAM = 'setupReturn';

export type OnboardingHintKey = 'devices' | 'customers' | 'tickets' | 'scripts' | 'policies' | 'logs' | 'knowledge';

export const ONBOARDING_COACH_MARKS: Record<OnboardingHintKey, { title: string; body: string }> = {
  devices: {
    title: "Here's Your Devices",
    body: 'See full details and health, connect via remote shell or remote control, run scripts, manage files, and take actions like reboot or archive, all from here.',
  },
  customers: {
    title: "Here's Your Customers",
    body: 'Manage every client here — service tiers, SLAs, contacts, and the devices that belong to them. Add more customers whenever you need.',
  },
  tickets: {
    title: "Here's Your Ticket",
    body: 'This is a ticket. Fae opens one for every client chat and resolves it right in the conversation. When something needs a human, your team can step in, take over the chat, and add details.',
  },
  scripts: {
    title: "Here's Your Script",
    body: 'This is a script. Run it on any connected device, on demand or on a schedule, and reuse it across your fleet. Every run is logged, so you can always see what ran where and when.',
  },
  policies: {
    title: "Here's Your Policy",
    body: 'This is a monitoring policy. It watches your devices against the rules you set and raises an alert the moment one crosses a threshold. Assign it to devices, adjust the rules anytime, and see every triggered alert here.',
  },
  logs: {
    title: "Here's Your Activity Log",
    body: 'This is your activity log. It records everything that happens across your workspace: device actions, script runs, ticket changes, and team activity. Filter by actor, event type, or time to find exactly what you need.',
  },
  knowledge: {
    title: 'Create Your First Article',
    body: 'This is where you write knowledge base articles. Add a title and content, organize with folders and tags. Everything you publish here, Mingo can use to answer questions and resolve tickets.',
  },
};

export function isOnboardingHintKey(value: string | null): value is OnboardingHintKey {
  return value != null && value in ONBOARDING_COACH_MARKS;
}

/**
 * Build a destination URL that triggers the coach-mark on arrival.
 * @param target      the page to open (e.g. "/devices")
 * @param hint        which coach-mark copy to show
 * @param returnPath  where "Continue Initial Setup" returns to (the onboarding surface)
 */
export function onboardingHintUrl(target: string, hint: OnboardingHintKey, returnPath: string): string {
  const params = new URLSearchParams({ [SETUP_HINT_PARAM]: hint, [SETUP_RETURN_PARAM]: returnPath });
  // `target` may already carry a query string (e.g. a detail page's `?id=`).
  const separator = target.includes('?') ? '&' : '?';
  return `${target}${separator}${params.toString()}`;
}
