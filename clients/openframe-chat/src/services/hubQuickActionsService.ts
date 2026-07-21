import { tokenService } from './tokenService';

/** The Fae agent's public config slug in the Product Hub (`agent-fae` source). */
const FAE_AGENT_SLUG = 'fae';

/** Hub quick action as served by the agent public-config endpoint. */
interface HubQuickActionDto {
  id: string;
  label: string;
  prompt: string;
}

/** Chat-facing shape (matches the tenant `AiQuickAction`: name = chip label, instructions = prompt). */
export interface HubQuickAction {
  id: string;
  name: string;
  instructions: string;
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
    throw new Error(`Failed to load hub default quick actions (${response.status})`);
  }

  const data = (await response.json()) as { quickActions?: HubQuickActionDto[] | null };
  return (data.quickActions ?? []).map(action => ({
    id: action.id,
    name: action.label,
    instructions: action.prompt,
  }));
}
