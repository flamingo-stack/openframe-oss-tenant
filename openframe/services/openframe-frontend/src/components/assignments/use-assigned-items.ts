'use client';

import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import { type Customer, mapOrganizationNode, type OrganizationNode } from '@/app/(app)/customers/hooks/use-customers';
import type { Device, DevicesGraphQlNode } from '@/app/(app)/devices/types/device.types';
import { createDeviceListItem } from '@/app/(app)/devices/utils/device-transform';
import type { KnowledgeBaseRow } from '@/app/(app)/knowledge-base/components/knowledge-base-table-columns';
import type { Dialog, DialogStatus } from '@/app/(app)/tickets/types/dialog.types';
import { postGraphQl } from './graphql';
import { ensureGlobalId } from './relay-id';
import {
  ASSIGNMENT_TARGET_TYPES,
  type AssignmentItemType,
  type AssignmentRef,
  type AssignmentsValue,
  type AssignmentTargetType,
} from './types';

const ASSIGNED_ITEMS_QUERY = `#graphql
  query AssignmentsAssignedItems($itemId: ID!, $targetType: AssignmentTargetType!, $first: Int) {
    assignedItems(itemId: $itemId, targetType: $targetType, first: $first) {
      edges {
        node {
          id
          displayName
          target {
            __typename
            id
            ... on Organization {
              organizationId
              name
              websiteUrl
              category
              numberOfEmployees
              monthlyRevenue
              contractEndDate
              createdAt
              updatedAt
              contactInformation { contacts { contactName email } }
              image { imageUrl }
            }
            ... on Machine {
              machineId
              hostname
              displayName
              ip
              macAddress
              osUuid
              agentVersion
              machineStatus: status
              lastSeen
              organization { id organizationId name image { imageUrl } }
              serialNumber
              manufacturer
              model
              machineType: type
              osType
              osVersion
              osBuild
              timezone
              registeredAt
              updatedAt
              machineTags: tags { key description color values createdAt }
              toolConnections { id machineId toolType agentToolId status metadata connectedAt lastSyncAt disconnectedAt }
            }
            ... on KnowledgeBaseItem {
              articleType: type
              name
              parentId
              articleStatus: status
              summary
              createdAt
              updatedAt
              articleTags: tags { id key color }
            }
            ... on Ticket {
              ticketNumber
              title
              description
              status
              creationSource
              deviceId
              deviceHostname
              ticketOrganizationId: organizationId
              organizationName
              assignedTo
              assignedName
              createdAt
              updatedAt
              resolvedAt
            }
          }
        }
      }
    }
  }
`;

const PAGE_SIZE = 100;

interface AssignedTargetNode {
  // biome-ignore lint/style/useNamingConvention: __typename is a GraphQL protocol field name
  __typename: 'Organization' | 'Machine' | 'Ticket' | 'KnowledgeBaseItem';
  id: string;
}

interface AssignedItemsData {
  assignedItems: {
    edges: Array<{
      node: { id: string; displayName: string; target: AssignedTargetNode | null };
    }>;
  };
}

function unaliasFields(target: AssignedTargetNode): Record<string, unknown> {
  const t = target as unknown as Record<string, unknown>;
  return {
    ...t,
    status: t.machineStatus ?? t.articleStatus ?? t.status,
    type: t.machineType ?? t.articleType ?? t.type,
    tags: t.machineTags ?? t.articleTags ?? t.tags,
    organizationId: t.ticketOrganizationId ?? t.organizationId,
  };
}

function toDialog(target: AssignedTargetNode): Dialog {
  const t = unaliasFields(target);
  return {
    id: target.id,
    title: (t.title as string) || 'Untitled Dialog',
    status: ((t.status as string) ?? 'ACTIVE') as DialogStatus,
    owner: { type: 'CLIENT' },
    createdAt: (t.createdAt as string) || '',
    resolvedAt: (t.resolvedAt as string) ?? null,
    ticketNumber: t.ticketNumber as number | undefined,
    description: t.description as string | undefined,
    creationSource: t.creationSource as string | undefined,
    deviceId: t.deviceId as string | undefined,
    deviceHostname: t.deviceHostname as string | undefined,
    organizationId: t.organizationId as string | undefined,
    organizationName: t.organizationName as string | undefined,
    assignedTo: t.assignedTo as string | undefined,
    assignedName: t.assignedName as string | undefined,
  };
}

interface AssignedItemsPayload {
  refs: AssignmentRef[];
  customers?: Customer[];
  devices?: Device[];
  articles?: KnowledgeBaseRow[];
  tickets?: Dialog[];
}

async function fetchAssignedItems(itemId: string, targetType: AssignmentTargetType): Promise<AssignedItemsPayload> {
  const data = await postGraphQl<AssignedItemsData>(ASSIGNED_ITEMS_QUERY, {
    itemId,
    targetType,
    first: PAGE_SIZE,
  });

  const refs: AssignmentRef[] = [];
  const customers: Customer[] = [];
  const devices: Device[] = [];
  const articles: KnowledgeBaseRow[] = [];
  const tickets: Dialog[] = [];

  for (const { node } of data.assignedItems.edges) {
    const target = node.target;
    if (!target) continue;
    refs.push({ id: target.id, label: node.displayName });
    switch (target.__typename) {
      case 'Organization':
        customers.push(mapOrganizationNode(unaliasFields(target) as unknown as OrganizationNode));
        break;
      case 'Machine':
        devices.push(createDeviceListItem(unaliasFields(target) as unknown as DevicesGraphQlNode));
        break;
      case 'KnowledgeBaseItem':
        articles.push(unaliasFields(target) as unknown as KnowledgeBaseRow);
        break;
      case 'Ticket':
        tickets.push(toDialog(target));
        break;
    }
  }

  switch (targetType) {
    case 'ORGANIZATION':
      return { refs, customers };
    case 'DEVICE':
      return { refs, devices };
    case 'KNOWLEDGE_ARTICLE':
      return { refs, articles };
    case 'TICKET':
      return { refs, tickets };
  }
}

interface UseAssignedItemsOptions {
  itemId: string | null;
  itemType: AssignmentItemType;
  enabled?: boolean;
}

export interface AssignedItemsResult {
  value: AssignmentsValue;
  customers?: Customer[];
  devices?: Device[];
  articles?: KnowledgeBaseRow[];
  tickets?: Dialog[];
  isLoading: boolean;
  isReady: boolean;
}

function combineAssignedItems(results: UseQueryResult<AssignedItemsPayload, Error>[]): AssignedItemsResult {
  const value: AssignmentsValue = {};
  const out: AssignedItemsResult = { value, isLoading: false, isReady: true };
  ASSIGNMENT_TARGET_TYPES.forEach((type, i) => {
    const result = results[i];
    if (result.isLoading) {
      out.isLoading = true;
      out.isReady = false;
    }
    const payload = result.data;
    if (!payload) return;
    if (payload.refs.length) value[type] = payload.refs;
    if (payload.customers?.length) out.customers = payload.customers;
    if (payload.devices?.length) out.devices = payload.devices;
    if (payload.articles?.length) out.articles = payload.articles;
    if (payload.tickets?.length) out.tickets = payload.tickets;
  });
  return out;
}

export function useAssignedItems({ itemId, itemType, enabled = true }: UseAssignedItemsOptions): AssignedItemsResult {
  const isEnabled = enabled && !!itemId;
  // TODO(backend): drop ensureGlobalId once ai-agent's Ticket type is Relay-compliant — see relay-id.ts.
  const normalizedItemId = itemId ? ensureGlobalId(itemType, itemId) : null;

  return useQueries({
    queries: ASSIGNMENT_TARGET_TYPES.map(targetType => ({
      queryKey: ['assignments', 'assigned-items', itemType, normalizedItemId, targetType],
      queryFn: () => fetchAssignedItems(normalizedItemId as string, targetType),
      enabled: isEnabled,
      staleTime: 30_000,
    })),
    combine: combineAssignedItems,
  });
}
