'use client';

import { graphql, useLazyLoadQuery } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';
import type { useKnowledgeBaseItemsFoldersQuery as UseKnowledgeBaseFoldersQueryType } from '@/__generated__/useKnowledgeBaseItemsFoldersQuery.graphql';

export const KNOWLEDGE_BASE_FOLDERS_CONNECTION_KEY = 'knowledgeBaseBodyFolders__knowledgeBaseItems';
export const KNOWLEDGE_BASE_ARTICLES_CONNECTION_KEY = 'knowledgeBaseBodyArticles__knowledgeBaseItems';
export const KNOWLEDGE_BASE_ARTICLES_SUBTREE_CONNECTION_KEY = 'knowledgeBaseBodyArticlesSubtree__knowledgeBaseItems';

export interface KnowledgeBaseItemsConnectionFilter {
  parentId: string | null;
  search: string | null;
  tagIds?: ReadonlyArray<string>;
}

function normalizeTagIds(tagIds: ReadonlyArray<string> | undefined): string[] | null {
  return tagIds && tagIds.length > 0 ? [...tagIds] : null;
}

export function getKnowledgeBaseFoldersConnectionId({
  parentId,
  search,
  tagIds,
}: KnowledgeBaseItemsConnectionFilter): string {
  return ConnectionHandler.getConnectionID('client:root', KNOWLEDGE_BASE_FOLDERS_CONNECTION_KEY, {
    filter: { parentId, type: 'FOLDER', tagIds: normalizeTagIds(tagIds) },
    search: search ?? null,
  });
}

export function getKnowledgeBaseArticlesConnectionId({
  parentId,
  search,
  tagIds,
}: KnowledgeBaseItemsConnectionFilter): string {
  return ConnectionHandler.getConnectionID('client:root', KNOWLEDGE_BASE_ARTICLES_CONNECTION_KEY, {
    filter: { parentId, type: 'ARTICLE', tagIds: normalizeTagIds(tagIds) },
    search: search ?? null,
  });
}

export function getKnowledgeBaseArticlesSubtreeConnectionId({
  parentId,
  search,
  tagIds,
}: KnowledgeBaseItemsConnectionFilter): string {
  return ConnectionHandler.getConnectionID('client:root', KNOWLEDGE_BASE_ARTICLES_SUBTREE_CONNECTION_KEY, {
    filter: { parentId, type: null, tagIds: normalizeTagIds(tagIds) },
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
