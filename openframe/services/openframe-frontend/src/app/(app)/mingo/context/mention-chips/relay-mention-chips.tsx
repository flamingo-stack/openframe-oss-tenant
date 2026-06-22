'use client';

/**
 * Self-fetching mention chips for the GraphQL-resolvable entity types — the
 * `@marker:id` analogue of `[card://]` entity cards. Each suspends on first
 * fetch (→ skeleton), reads from the Relay store on streaming remounts
 * (`store-or-network`, no flash), and falls back to a plain id chip on error.
 *
 * id semantics: a mention carries the backend `ContextItemType.idHint`, NOT the
 * Relay node id (confirmed: device idHint = machineId, and `device(machineId:)`
 * resolves it). So:
 *   - device       → machineId          → `device(machineId:)`               → /devices/details/{machineId}
 *   - organization → organizationId      → `organizationByOrganizationId(...)` → /customers/details/{organizationId}
 *   - kb article   → knowledgeBaseItemId → `knowledgeBaseItem(id:)`            → /knowledge-base/details/{id}
 *     (KB's idHint equals the node id — there's no separate field — so the
 *      `id: ID!` lookup is correct; org's organizationId is a DISTINCT field,
 *      hence the dedicated `organizationByOrganizationId` query.)
 */

import { type ReactNode, Suspense } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { relayMentionChipsDeviceQuery } from '@/__generated__/relayMentionChipsDeviceQuery.graphql';
import type { relayMentionChipsKbQuery } from '@/__generated__/relayMentionChipsKbQuery.graphql';
import type { relayMentionChipsOrgQuery } from '@/__generated__/relayMentionChipsOrgQuery.graphql';
import { MentionErrorBoundary, MentionTag, MentionTagSkeleton } from './mention-tag';

interface MentionChipProps {
  id: string;
  icon?: ReactNode;
}

// ───────────────────────────── Device ───────────────────────────────────────

const DEVICE_QUERY = graphql`
  query relayMentionChipsDeviceQuery($machineId: String!) {
    device(machineId: $machineId) {
      hostname
      displayName
    }
  }
`;

function DeviceInner({ id, icon }: MentionChipProps) {
  const data = useLazyLoadQuery<relayMentionChipsDeviceQuery>(
    DEVICE_QUERY,
    { machineId: id },
    { fetchPolicy: 'store-or-network' },
  );
  const d = data.device;
  return <MentionTag icon={icon} label={d?.displayName || d?.hostname || id} href={`/devices/details/${id}`} />;
}

export function DeviceMentionChip({ id, icon }: MentionChipProps) {
  return (
    <MentionErrorBoundary fallback={<MentionTag icon={icon} label={id} href={`/devices/details/${id}`} />}>
      <Suspense fallback={<MentionTagSkeleton icon={icon} />}>
        <DeviceInner id={id} icon={icon} />
      </Suspense>
    </MentionErrorBoundary>
  );
}

// ─────────────────────────── Organization ───────────────────────────────────

const ORG_QUERY = graphql`
  query relayMentionChipsOrgQuery($organizationId: String!) {
    organizationByOrganizationId(organizationId: $organizationId) {
      name
    }
  }
`;

function OrgInner({ id, icon }: MentionChipProps) {
  // The mention id IS the organizationId (idHint), which the customers route
  // also keys on — so it's both the query arg and the href segment.
  const data = useLazyLoadQuery<relayMentionChipsOrgQuery>(
    ORG_QUERY,
    { organizationId: id },
    { fetchPolicy: 'store-or-network' },
  );
  const o = data.organizationByOrganizationId;
  return <MentionTag icon={icon} label={o?.name || id} href={`/customers/details/${id}`} />;
}

export function OrganizationMentionChip({ id, icon }: MentionChipProps) {
  return (
    <MentionErrorBoundary fallback={<MentionTag icon={icon} label={id} href={`/customers/details/${id}`} />}>
      <Suspense fallback={<MentionTagSkeleton icon={icon} />}>
        <OrgInner id={id} icon={icon} />
      </Suspense>
    </MentionErrorBoundary>
  );
}

// ───────────────────────────── KB Article ───────────────────────────────────

const KB_QUERY = graphql`
  query relayMentionChipsKbQuery($id: ID!) {
    knowledgeBaseItem(id: $id) {
      name
    }
  }
`;

function KbInner({ id, icon }: MentionChipProps) {
  const data = useLazyLoadQuery<relayMentionChipsKbQuery>(KB_QUERY, { id }, { fetchPolicy: 'store-or-network' });
  const k = data.knowledgeBaseItem;
  return <MentionTag icon={icon} label={k?.name || id} href={`/knowledge-base/details/${id}`} />;
}

export function KbMentionChip({ id, icon }: MentionChipProps) {
  return (
    <MentionErrorBoundary fallback={<MentionTag icon={icon} label={id} href={`/knowledge-base/details/${id}`} />}>
      <Suspense fallback={<MentionTagSkeleton icon={icon} />}>
        <KbInner id={id} icon={icon} />
      </Suspense>
    </MentionErrorBoundary>
  );
}
