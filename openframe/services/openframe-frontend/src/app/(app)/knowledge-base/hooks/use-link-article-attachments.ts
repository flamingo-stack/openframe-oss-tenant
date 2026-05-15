'use client';

import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type { useLinkArticleAttachmentsMutation as UseLinkArticleAttachmentsMutationType } from '@/__generated__/useLinkArticleAttachmentsMutation.graphql';

const linkArticleAttachmentsMutation = graphql`
  mutation useLinkArticleAttachmentsMutation($input: LinkKnowledgeBaseTempAttachmentsInput!) {
    linkKnowledgeBaseTempAttachmentsToArticle(input: $input) {
      id
      fileName
      fileSize
      contentType
      createdAt
    }
  }
`;

interface LinkInput {
  articleId: string;
  tempIds: string[];
}

export function useLinkArticleAttachments() {
  const [commit, isInFlight] = useMutation<UseLinkArticleAttachmentsMutationType>(linkArticleAttachmentsMutation);

  const linkAttachments = useCallback(
    (input: LinkInput) =>
      new Promise<void>((resolve, reject) => {
        commit({
          variables: { input },
          onCompleted: (_response, errors) => {
            if (errors?.length) {
              reject(new Error(errors[0].message));
              return;
            }
            resolve();
          },
          onError: reject,
        });
      }),
    [commit],
  );

  return { linkAttachments, isPending: isInFlight };
}
