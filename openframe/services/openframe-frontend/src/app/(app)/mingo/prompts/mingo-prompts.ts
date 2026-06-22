/**
 * Central registry of the prompts Mingo is launched with from across the app.
 * Each key is a `MingoPromptSource` - the place the chat was invoked from (an
 * EmptyState "Ask Mingo about X" button today). Keeping every prompt here means
 * copy lives in one place and new entry points are a one-line addition.
 */

export type MingoPromptSource =
  | 'queries'
  | 'customers'
  | 'policies'
  | 'scripts'
  | 'script-schedules'
  | 'logs'
  | 'devices';

/** One prompt per invocation source. Edit copy here only. */
export const MINGO_PROMPTS: Record<MingoPromptSource, string> = {
  queries:
    'Help me build a query across my fleet. For example, which devices have Chrome installed, who is on an outdated OS, or which machines are low on disk space.',
  customers:
    'Help me organize my customers - grouping devices and users by client, and tracking their security posture.',
  policies: 'Help me create a policy to apply settings across many devices at once.',
  scripts: 'Help me write and run a script on one device or push it to many at once.',
  'script-schedules': 'Help me schedule a script to run hourly, daily, weekly, or on a custom cron.',
  logs: 'Help me explore my logs - who did what, when, and on which device.',
  devices: 'Help me monitor device health - CPU, memory, and disk usage in real time.',
};

export function getMingoPrompt(source: MingoPromptSource): string {
  return MINGO_PROMPTS[source];
}
