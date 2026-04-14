export type TagEntityType = 'DEVICE' | 'TICKET' | 'KNOWLEDGE_ARTICLE';

export interface TagEntry {
  key: string;
  values: string[];
}

export interface TagEntryWithId extends TagEntry {
  id: string;
}

export interface Tag {
  id: string;
  key: string;
  description?: string;
  color?: string;
  entityType?: TagEntityType;
  createdAt?: string;
}
