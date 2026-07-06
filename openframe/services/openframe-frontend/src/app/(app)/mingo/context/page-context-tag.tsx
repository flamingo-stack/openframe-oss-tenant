'use client';

/**
 * MingoPageContextTag — the Mingo-mode "current page context" banner
 * (Figma 192:51006). A full-bleed row under the chat header that names the
 * entity whose detail page the user is currently viewing, so they can ask
 * Mingo to recall it. Rendered into `EmbeddableChat`'s `mingoContextBanner`
 * slot (shown only in Mingo mode) by `OpenframeEmbeddableChatEntry`.
 *
 * Data source: the existing `mingo-context-store.openView`. The NAME is read
 * straight from `openView.label` — it's captured in-memory by `useTrackOpenView`
 * on each entity detail page (which already has the entity loaded), and rides
 * out on every Mingo message as the current view. So this banner needs NO extra
 * storage and NO id→name fetch: it shows exactly the same `openView` the agent
 * receives. `openView` is intentionally NOT persisted (it means "the page open
 * right now"); when there's none (a non-entity page) we render nothing.
 */

import {
  BookBookmarkIcon,
  BracketCurlyEllipsisVrIcon,
  BracketCurlyIcon,
  FolderShieldIcon,
  IdCardIcon,
  MonitorIcon,
  QuestionCircleIcon,
  TagIcon,
  UserIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ReactNode } from 'react';
import { useMingoContextStore } from '../stores/mingo-context-store';
import { CONTEXT_ENTITY_KIND, type ContextEntityKind } from './context-types';

/** Lead glyph per entity kind — the 16px analogue of `MINGO_CONTEXT_ENTITY_TYPES`. */
const ICON_BY_KIND: Record<ContextEntityKind, ReactNode> = {
  [CONTEXT_ENTITY_KIND.DEVICE]: <MonitorIcon size={16} />,
  [CONTEXT_ENTITY_KIND.SCRIPT]: <BracketCurlyIcon size={16} />,
  [CONTEXT_ENTITY_KIND.TICKET]: <TagIcon size={16} />,
  [CONTEXT_ENTITY_KIND.ORGANIZATION]: <IdCardIcon size={16} />,
  [CONTEXT_ENTITY_KIND.USER]: <UserIcon size={16} />,
  [CONTEXT_ENTITY_KIND.KB_ARTICLE]: <BookBookmarkIcon size={16} />,
  [CONTEXT_ENTITY_KIND.POLICY]: <FolderShieldIcon size={16} />,
  [CONTEXT_ENTITY_KIND.QUERY]: <BracketCurlyEllipsisVrIcon size={16} />,
};

const CONTEXT_TOOLTIP =
  "Mingo tracks the pages you visit this session, including the one you're on now, so you can ask it to recall something you saw earlier.";

export function MingoPageContextTag() {
  const openView = useMingoContextStore(s => s.openView);

  // "Show the current page context if it exists" — no open entity view, no row.
  if (!openView) return null;

  return (
    <div className="flex items-center gap-[var(--spacing-system-xs)] border-b border-ods-border bg-ods-card px-[var(--spacing-system-m)] py-[var(--spacing-system-xsf)] w-full">
      <span className="shrink-0 text-ods-text-secondary">{ICON_BY_KIND[openView.type]}</span>
      {/* `text-h5` is the ODS caption token: it already applies the Azeret Mono
          family, uppercase, and -0.02em tracking — i.e. the Figma label style. */}
      <p className="flex-1 min-w-0 truncate text-h5 text-ods-text-primary" title={openView.label}>
        {openView.label}
      </p>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            className="shrink-0 text-ods-text-secondary hover:text-ods-text-primary transition-colors"
            aria-label="About page context"
          >
            <QuestionCircleIcon size={16} />
          </TooltipTrigger>
          <TooltipContent className="max-w-[260px]">{CONTEXT_TOOLTIP}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
