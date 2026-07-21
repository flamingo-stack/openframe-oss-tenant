import { tokenService } from './tokenService';

/** The Fae agent's public config slug in the Product Hub (`agent-fae` source). */
const FAE_AGENT_SLUG = 'fae';

/** Hub quick action as served by the agent public-config endpoint. */
interface HubQuickActionDto {
  id: string;
  label: string;
  prompt: string;
  /** Optional glyph the hub curates for the action (library name, uploaded URL,
   *  or icon props). Rendered on the chat chip. */
  iconName?: string | null;
  iconUrl?: string | null;
  iconProps?: Record<string, unknown> | null;
}

/** Chat-facing shape (matches the tenant `AiQuickAction`: name = chip label, instructions = prompt). */
export interface HubQuickAction {
  id: string;
  name: string;
  instructions: string;
  iconName?: string | null;
  iconUrl?: string | null;
  iconProps?: Record<string, unknown> | null;
}

/**
 * OpenFrame default quick actions for the client (Fae) chat, published in the
 * Product Hub separately from the admin (Mingo) set. Served through the tenant
 * gateway's `/chat/content/**` hub proxy (`chat_guide_route`), so the call uses
 * the same base URL + Bearer auth as every other chat request. Applied while
 * `clientAiConfig.quickActionsIsDefault` is true; the tenant BE only stores the
 * org's customized list.
 */
export async function fetchHubDefaultQuickActions(): Promise<HubQuickAction[]> {
  await tokenService.ensureTokenReady();
  const baseUrl = tokenService.getCurrentApiBaseUrl();
  const token = tokenService.getCurrentToken();

  if (!baseUrl || !token) {
    throw new Error('API base URL or token not available');
  }

  const response = await fetch(`${baseUrl}/chat/content/api/ai-agents/${FAE_AGENT_SLUG}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // Surfaced in the console on purpose: a failing hub proxy silently degrades
    // the chips to the bundled fallback, which is easy to misread as "works".
    console.warn(`[hubQuickActions] hub proxy request failed with ${response.status}`);
    throw new Error(`Failed to load hub default quick actions (${response.status})`);
  }

  const data = (await response.json()) as { quickActions?: HubQuickActionDto[] | null };
  return (data.quickActions ?? []).map(action => ({
    id: action.id,
    name: action.label,
    instructions: action.prompt,
    iconName: action.iconName,
    iconUrl: action.iconUrl,
    iconProps: action.iconProps,
  }));
}
