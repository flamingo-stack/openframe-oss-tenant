'use client';

import { ConnectionHandler } from 'relay-runtime';

export const ARCHIVED_ARTICLES_CONNECTION_KEY = 'knowledgeBaseTable_archivedArticles';

export interface ArchivedArticlesConnectionFilter {
  search: string | null;
  tagIds: ReadonlyArray<string> | null;
}

export function getArchivedArticlesConnectionId({ search, tagIds }: ArchivedArticlesConnectionFilter): string {
  return ConnectionHandler.getConnectionID('client:root', ARCHIVED_ARTICLES_CONNECTION_KEY, {
    search: search ?? null,
    tagIds: tagIds ?? null,
  });
}
