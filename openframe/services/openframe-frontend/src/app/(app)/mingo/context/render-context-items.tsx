'use client';

/**
 * Dispatcher wired into `ChatContextPickerConfig.renderItems`. Maps the active
 * entity type to its per-type items component (which owns data via its own
 * hooks). The lib calls this INSIDE its `<Suspense>` + error boundary, so the
 * returned component may suspend on initial load.
 *
 * Must return a JSX ELEMENT (not call the component as a function) so the
 * component's hooks run correctly; `key={type}` remounts on type switch so each
 * type's hook state is isolated.
 */

import type { ContextItemsRenderArgs } from '@flamingo-stack/openframe-frontend-core/components/chat';
import type { ReactNode } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { LegacyScriptItems, UserItems } from './batch-items';
import { CONTEXT_ENTITY_KIND } from './context-types';
import type { ContextItemsProps } from './items-shared';
import { DeviceItems, KnowledgeBaseItems, OrganizationItems, ScriptItems } from './relay-items';
import { PolicyItems, QueryItems, TicketItems } from './rest-items';

const COMPONENTS: Record<string, (p: ContextItemsProps) => ReactNode> = {
  [CONTEXT_ENTITY_KIND.DEVICE]: DeviceItems,
  [CONTEXT_ENTITY_KIND.ORGANIZATION]: OrganizationItems,
  [CONTEXT_ENTITY_KIND.KB_ARTICLE]: KnowledgeBaseItems,
  [CONTEXT_ENTITY_KIND.TICKET]: TicketItems,
  [CONTEXT_ENTITY_KIND.POLICY]: PolicyItems,
  [CONTEXT_ENTITY_KIND.QUERY]: QueryItems,
  [CONTEXT_ENTITY_KIND.USER]: UserItems,
};

export function renderMingoContextItems({
  type,
  query,
  selectedKeys,
  onToggle,
  atLimit,
}: ContextItemsRenderArgs): ReactNode {
  // Only the manually-added SCRIPT dropdown source follows the `scripts-v2`
  // flag: ON → native OpenFrame `scripts(...)` (Relay, ACTIVE only); OFF →
  // legacy Tactical list. The mention chips + passive (open-view/history)
  // context always resolve via the new scripts, regardless of the flag —
  // evaluated at render time so a late-loading flag value is respected.
  const Component =
    type === CONTEXT_ENTITY_KIND.SCRIPT
      ? featureFlags.scriptsV2.enabled()
        ? ScriptItems
        : LegacyScriptItems
      : COMPONENTS[type];
  if (!Component) return null;
  return <Component key={type} query={query} selectedKeys={selectedKeys} onToggle={onToggle} atLimit={atLimit} />;
}
