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
import { CONTEXT_ENTITY_KIND } from './context-types';

/**
 * Entity types in picker display order.
 *
 * POLICY and QUERY are offered alongside the rest. ⚠️ The backend
 * `ContextItemReference.type` enum (POST /chat/api/v1/messages) did not include
 * them as of the last verified spec — they are exposed ahead of the backend
 * landing the enum values (expected imminently). Until then, attaching a
 * Policy/Query and sending may 400 the whole message; if the backend rollout
 * slips, drop these two rows again.
 */
export const MINGO_CONTEXT_ENTITY_TYPES: ChatContextEntityType[] = [
  { type: CONTEXT_ENTITY_KIND.DEVICE, label: 'Device', icon: <MonitorIcon size={24} /> },
  { type: CONTEXT_ENTITY_KIND.SCRIPT, label: 'Script', icon: <BracketCurlyIcon size={24} /> },
  { type: CONTEXT_ENTITY_KIND.TICKET, label: 'Ticket', icon: <TagIcon size={24} /> },
  { type: CONTEXT_ENTITY_KIND.ORGANIZATION, label: 'Customer', icon: <IdCardIcon size={24} /> },
  { type: CONTEXT_ENTITY_KIND.USER, label: 'User', icon: <UserIcon size={24} /> },
  { type: CONTEXT_ENTITY_KIND.KB_ARTICLE, label: 'Knowledge Article', icon: <BookBookmarkIcon size={24} /> },
  { type: CONTEXT_ENTITY_KIND.POLICY, label: 'Policy', icon: <FolderShieldIcon size={24} /> },
  { type: CONTEXT_ENTITY_KIND.QUERY, label: 'Query', icon: <BracketCurlyEllipsisVrIcon size={24} /> },
];
