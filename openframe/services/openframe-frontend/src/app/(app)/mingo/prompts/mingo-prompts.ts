/**
 * Central registry of the prompts Mingo is launched with from across the app.
 * Each key is a `MingoPromptSource` - the place the chat was invoked from (an
 * EmptyState "Ask Mingo about X" button today). Keeping every prompt here means
 * copy lives in one place and new entry points are a one-line addition.
 *
 * These launch Mingo's GUIDE mode (contextual section guidance from the
 * knowledge base), so the copy is a simple "Tell me about <Section>" — the user
 * gets an overview + how-to for the area they're looking at.
 */

export type MingoPromptSource =
  | 'queries'
  | 'customers'
  | 'policies'
  | 'scripts'
  | 'script-schedules'
  | 'logs'
  | 'devices'
  | 'checks';

/** One prompt per invocation source. Edit copy here only. */
export const MINGO_PROMPTS: Record<MingoPromptSource, string> = {
  queries: 'Tell me about Queries.',
  customers: 'Tell me about Customers.',
  policies: 'Tell me about Policies.',
  scripts: 'Tell me about Scripts.',
  'script-schedules': 'Tell me about Script Schedules.',
  logs: 'Tell me about Logs.',
  devices: 'Tell me about Devices.',
  checks: 'Tell me about Checks.',
};

export function getMingoPrompt(source: MingoPromptSource): string {
  return MINGO_PROMPTS[source];
}
