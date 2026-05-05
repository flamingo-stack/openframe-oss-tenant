'use client';

import { graphql, useLazyLoadQuery } from 'react-relay';
import type { useKnowledgeBaseItemQuery as UseKnowledgeBaseItemQueryType } from '@/__generated__/useKnowledgeBaseItemQuery.graphql';

export const knowledgeBaseItemQuery = graphql`
  query useKnowledgeBaseItemQuery($id: ID!) {
    knowledgeBaseItem(id: $id) {
      id
      type
      name
      parentId
      slug
      content
      summary
      status
      publishedAt
      createdAt
      updatedAt
      author {
        id
        firstName
        lastName
        email
      }
      tags {
        id
        key
        color
      }
    }
  }
`;

export type KnowledgeBaseItemNode = NonNullable<UseKnowledgeBaseItemQueryType['response']['knowledgeBaseItem']>;

export function useKnowledgeBaseItem(id: string) {
  const data = useLazyLoadQuery<UseKnowledgeBaseItemQueryType>(
    knowledgeBaseItemQuery,
    { id },
    { fetchPolicy: 'store-or-network' },
  );
  return data.knowledgeBaseItem;
}
