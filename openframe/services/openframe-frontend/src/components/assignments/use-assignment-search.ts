'use client';

import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ticketService } from '@/app/(app)/tickets/services';
import { postGraphQl } from './graphql';
import type { AssignmentTargetType } from './types';

const PAGE_SIZE = 20;

export interface AssignmentSearchOption {
  label: string;
  value: string;
}

interface ConnectionEdges<T> {
  edges: Array<{ node: T }>;
}

const ORGANIZATIONS_SEARCH_QUERY = `#graphql
  query AssignmentsOrganizationsSearch($search: String, $first: Int) {
    organizations(search: $search, first: $first) { edges { node { id name } } }
  }
`;

const DEVICES_SEARCH_QUERY = `#graphql
  query AssignmentsDevicesSearch($search: String, $first: Int) {
    devices(search: $search, first: $first) { edges { node { id hostname displayName } } }
  }
`;

const KNOWLEDGE_ARTICLES_TREE_QUERY = `#graphql
  query AssignmentsKnowledgeArticleTree {
    knowledgeBaseArticleTree { id name }
  }
`;

const fetchCustomers = async (search: string): Promise<AssignmentSearchOption[]> => {
  const data = await postGraphQl<{ organizations: ConnectionEdges<{ id: string; name: string }> }>(
    ORGANIZATIONS_SEARCH_QUERY,
    { search, first: PAGE_SIZE },
  );
  return data.organizations.edges.map(({ node }) => ({ value: node.id, label: node.name }));
};

const fetchDevices = async (search: string): Promise<AssignmentSearchOption[]> => {
  const data = await postGraphQl<{
    devices: ConnectionEdges<{ id: string; hostname: string | null; displayName: string | null }>;
  }>(DEVICES_SEARCH_QUERY, { search, first: PAGE_SIZE });
  return data.devices.edges.map(({ node }) => ({
    value: node.id,
    label: node.displayName ?? node.hostname ?? node.id,
  }));
};

const fetchTickets = async (search: string): Promise<AssignmentSearchOption[]> => {
  const page = await ticketService.fetchDialogs({
    statuses: ['ACTIVE', 'TECH_REQUIRED', 'ON_HOLD', 'RESOLVED'],
    search: search || undefined,
    limit: PAGE_SIZE,
  });
  return page.dialogs.map(d => ({
    value: d.id,
    label: d.title || (d.ticketNumber ? `#${d.ticketNumber}` : d.id),
  }));
};

const fetchKnowledgeArticles = async (): Promise<AssignmentSearchOption[]> => {
  const data = await postGraphQl<{ knowledgeBaseArticleTree: Array<{ id: string; name: string }> }>(
    KNOWLEDGE_ARTICLES_TREE_QUERY,
    {},
  );
  return data.knowledgeBaseArticleTree.map(node => ({ value: node.id, label: node.name }));
};

const SERVER_SEARCH_FETCHERS: Partial<
  Record<AssignmentTargetType, (search: string) => Promise<AssignmentSearchOption[]>>
> = {
  ORGANIZATION: fetchCustomers,
  DEVICE: fetchDevices,
  TICKET: fetchTickets,
};

const EMPTY_OPTIONS: AssignmentSearchOption[] = [];

function useServerSearchOptions(
  targetType: AssignmentTargetType,
  search: string,
): { options: AssignmentSearchOption[]; isLoading: boolean } {
  const debouncedSearch = useDebounce(search, 300);
  const fetcher = SERVER_SEARCH_FETCHERS[targetType];
  const query = useQuery({
    queryKey: ['assignments', 'search', targetType, debouncedSearch],
    queryFn: () => (fetcher ? fetcher(debouncedSearch) : Promise.resolve(EMPTY_OPTIONS)),
    enabled: !!fetcher,
    staleTime: 30_000,
  });
  return { options: query.data ?? EMPTY_OPTIONS, isLoading: query.isLoading };
}

function useKnowledgeArticleOptions(search: string): { options: AssignmentSearchOption[]; isLoading: boolean } {
  const query = useQuery({
    queryKey: ['assignments', 'search', 'KNOWLEDGE_ARTICLE'],
    queryFn: fetchKnowledgeArticles,
    staleTime: 30_000,
  });
  const debouncedSearch = useDebounce(search, 300);
  const options = useMemo(() => {
    const all = query.data ?? EMPTY_OPTIONS;
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(opt => opt.label.toLowerCase().includes(needle));
  }, [query.data, debouncedSearch]);
  return { options, isLoading: query.isLoading };
}

export function useAssignmentSearch(
  targetType: AssignmentTargetType,
  search: string,
): { options: AssignmentSearchOption[]; isLoading: boolean } {
  const articleResult = useKnowledgeArticleOptions(search);
  const serverResult = useServerSearchOptions(targetType, search);
  return targetType === 'KNOWLEDGE_ARTICLE' ? articleResult : serverResult;
}
