'use client';

import { graphql, useLazyLoadQuery } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';
import type { useKnowledgeBaseItemsFoldersQuery as UseKnowledgeBaseFoldersQueryType } from '@/__generated__/useKnowledgeBaseItemsFoldersQuery.graphql';

export const KNOWLEDGE_BASE_BODY_CONNECTION_KEY = 'knowledgeBaseBody_knowledgeBaseItems';

export interface KnowledgeBaseItemsConnectionFilter {
  parentId: string | null;
  search: string | null;
  tagIds?: ReadonlyArray<string>;
}

export function getKnowledgeBaseItemsConnectionId({
  parentId,
  search,
  tagIds,
}: KnowledgeBaseItemsConnectionFilter): string {
  const normalizedTagIds = tagIds && tagIds.length > 0 ? [...tagIds] : null;
  return ConnectionHandler.getConnectionID('client:root', KNOWLEDGE_BASE_BODY_CONNECTION_KEY, {
    filter: { parentId, tagIds: normalizedTagIds },
    search: search ?? null,
  });
}

export const KNOWLEDGE_BASE_FOLDER_TREE_FIELD = 'knowledgeBaseFolderTree';

export const knowledgeBaseFoldersQuery = graphql`
  query useKnowledgeBaseItemsFoldersQuery {
    knowledgeBaseFolderTree {
      id
      name
      parentId
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
  return data.knowledgeBaseFolderTree.map(folder => ({
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId ?? null,
  }));
}

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

export const KNOWLEDGE_BASE_ROOT_LABEL = 'Knowledge Base';
