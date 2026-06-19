'use client';

/**
 * Mingo entity-context types — the picker's first-level list (Figma 31:28708).
 * `type` is the backend discriminator (also stamped onto each `ChatContextItem.
 * type`); `icon` is the lead glyph. The DATA for each type is fetched by its
 * per-type component (`relay-items` / `rest-items` / `batch-items`), dispatched
 * by `renderMingoContextItems`.
 */

import type { ChatContextEntityType } from '@flamingo-stack/openframe-frontend-core/components/chat';
import {
  BookBookmarkIcon,
  BracketCurlyEllipsisVrIcon,
  BracketCurlyIcon,
  FolderShieldIcon,
  IdCardIcon,
  MonitorIcon,
  TagIcon,
  UserIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { CONTEXT_ENTITY_KIND, CONTEXT_ENTITY_MARKER } from './context-types';

/**
 * Entity types in picker display order. `marker` is the backend mention short
 * form (from `CONTEXT_ENTITY_MARKER`) — the lib uses it to commit `@marker:id`
 * tokens that match the backend's `MentionParser`. All eight kinds (incl. POLICY
 * and QUERY) resolve server-side.
 */
export const MINGO_CONTEXT_ENTITY_TYPES: ChatContextEntityType[] = [
  {
    type: CONTEXT_ENTITY_KIND.DEVICE,
    label: 'Device',
    marker: CONTEXT_ENTITY_MARKER.DEVICE,
    icon: <MonitorIcon size={24} />,
  },
  {
    type: CONTEXT_ENTITY_KIND.SCRIPT,
    label: 'Script',
    marker: CONTEXT_ENTITY_MARKER.SCRIPT,
    icon: <BracketCurlyIcon size={24} />,
  },
  {
    type: CONTEXT_ENTITY_KIND.TICKET,
    label: 'Ticket',
    marker: CONTEXT_ENTITY_MARKER.TICKET,
    icon: <TagIcon size={24} />,
  },
  {
    type: CONTEXT_ENTITY_KIND.ORGANIZATION,
    label: 'Customer',
    marker: CONTEXT_ENTITY_MARKER.ORGANIZATION,
    icon: <IdCardIcon size={24} />,
  },
  { type: CONTEXT_ENTITY_KIND.USER, label: 'User', marker: CONTEXT_ENTITY_MARKER.USER, icon: <UserIcon size={24} /> },
  {
    type: CONTEXT_ENTITY_KIND.KB_ARTICLE,
    label: 'Knowledge Article',
    marker: CONTEXT_ENTITY_MARKER.KB_ARTICLE,
    icon: <BookBookmarkIcon size={24} />,
  },
  {
    type: CONTEXT_ENTITY_KIND.POLICY,
    label: 'Policy',
    marker: CONTEXT_ENTITY_MARKER.POLICY,
    icon: <FolderShieldIcon size={24} />,
  },
  {
    type: CONTEXT_ENTITY_KIND.QUERY,
    label: 'Query',
    marker: CONTEXT_ENTITY_MARKER.QUERY,
    icon: <BracketCurlyEllipsisVrIcon size={24} />,
  },
];
