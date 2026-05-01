'use client';

import { graphql, useLazyLoadQuery } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';
import type { useKnowledgeBaseFoldersQuery as UseKnowledgeBaseFoldersQueryType } from '@/__generated__/useKnowledgeBaseFoldersQuery.graphql';

/**
 * Connection key shared between the table query, fragment, and any mutation
 * that needs to insert/remove edges into the items list.
 */
export const KNOWLEDGE_BASE_TABLE_CONNECTION_KEY = 'knowledgeBaseTable_knowledgeBaseItems';

export interface KnowledgeBaseItemsConnectionFilter {
  parentId: string | null;
  search: string | null;
}

/**
 * Computes the Relay connection ID for the items list at a given folder. The
 * key + filter args here MUST match the @connection directive on the table
 * fragment in knowledge-base-table.tsx — otherwise mutation @appendEdge /
 * @deleteEdge directives won't find the connection in the cache.
 */
export function getKnowledgeBaseItemsConnectionId({ parentId, search }: KnowledgeBaseItemsConnectionFilter): string {
  return ConnectionHandler.getConnectionID('client:root', KNOWLEDGE_BASE_TABLE_CONNECTION_KEY, {
    filter: { parentId },
    search: search ?? null,
  });
}

/**
 * Folder picker query. Reuses the same `knowledgeBaseItems` field with a
 * type=FOLDER filter and a large `first` so the entire folder tree fits in a
 * single response. Used by move/delete folder modals and the article-form
 * folder dropdown.
 */
export const knowledgeBaseFoldersQuery = graphql`
  query useKnowledgeBaseFoldersQuery {
    knowledgeBaseItems(filter: { type: FOLDER }, first: 200) {
      edges {
        node {
          id
          name
          parentId
        }
      }
    }
  }
`;

export interface FolderOption {
  id: string;
  name: string;
  parentId: string | null;
}

export interface FolderTreeNode extends FolderOption {
  children: FolderTreeNode[];
}

export function useKnowledgeBaseFolders(): FolderOption[] {
  const data = useLazyLoadQuery<UseKnowledgeBaseFoldersQueryType>(
    knowledgeBaseFoldersQuery,
    {},
    { fetchPolicy: 'store-or-network' },
  );
  return (data.knowledgeBaseItems.edges ?? []).map(edge => ({
    id: edge.node.id,
    name: edge.node.name,
    parentId: edge.node.parentId ?? null,
  }));
}

/**
 * Convert a flat folder list to a nested tree, sorted by name at each level.
 */
export function buildFolderTree(folders: FolderOption[]): FolderTreeNode[] {
  const byParent = new Map<string | null, FolderTreeNode[]>();
  for (const folder of folders) {
    const node: FolderTreeNode = { ...folder, children: [] };
    const list = byParent.get(folder.parentId) ?? [];
    list.push(node);
    byParent.set(folder.parentId, list);
  }
  const attach = (node: FolderTreeNode): FolderTreeNode => {
    const children = (byParent.get(node.id) ?? []).map(attach);
    children.sort((a, b) => a.name.localeCompare(b.name));
    return { ...node, children };
  };
  const roots = (byParent.get(null) ?? []).map(attach);
  roots.sort((a, b) => a.name.localeCompare(b.name));
  return roots;
}
