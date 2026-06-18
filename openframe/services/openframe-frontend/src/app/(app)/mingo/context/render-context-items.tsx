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
import { ScriptItems, UserItems } from './batch-items';
import { CONTEXT_ENTITY_KIND } from './context-types';
import type { ContextItemsProps } from './items-shared';
import { DeviceItems, KnowledgeBaseItems, OrganizationItems } from './relay-items';
import { PolicyItems, QueryItems, TicketItems } from './rest-items';

const COMPONENTS: Record<string, (p: ContextItemsProps) => ReactNode> = {
  [CONTEXT_ENTITY_KIND.DEVICE]: DeviceItems,
  [CONTEXT_ENTITY_KIND.ORGANIZATION]: OrganizationItems,
  [CONTEXT_ENTITY_KIND.KB_ARTICLE]: KnowledgeBaseItems,
  [CONTEXT_ENTITY_KIND.TICKET]: TicketItems,
  [CONTEXT_ENTITY_KIND.POLICY]: PolicyItems,
  [CONTEXT_ENTITY_KIND.QUERY]: QueryItems,
  [CONTEXT_ENTITY_KIND.SCRIPT]: ScriptItems,
  [CONTEXT_ENTITY_KIND.USER]: UserItems,
};

export function renderMingoContextItems({
  type,
  query,
  selectedKeys,
  onToggle,
  atLimit,
}: ContextItemsRenderArgs): ReactNode {
  const Component = COMPONENTS[type];
  if (!Component) return null;
  return <Component key={type} query={query} selectedKeys={selectedKeys} onToggle={onToggle} atLimit={atLimit} />;
}
