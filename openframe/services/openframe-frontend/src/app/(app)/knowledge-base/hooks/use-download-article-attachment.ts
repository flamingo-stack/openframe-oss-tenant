'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useRelayEnvironment } from 'react-relay';
import { fetchQuery } from 'relay-runtime';
import type { useDownloadArticleAttachmentQuery as UseDownloadArticleAttachmentQueryType } from '@/__generated__/useDownloadArticleAttachmentQuery.graphql';

const downloadArticleAttachmentQuery = graphql`
  query useDownloadArticleAttachmentQuery($attachmentId: ID!) {
    knowledgeBaseAttachmentDownloadUrl(attachmentId: $attachmentId)
  }
`;

export function useDownloadArticleAttachment() {
  const { toast } = useToast();
  const environment = useRelayEnvironment();

  const download = useCallback(
    async (attachmentId: string, fileName: string) => {
      try {
        const data = await fetchQuery<UseDownloadArticleAttachmentQueryType>(
          environment,
          downloadArticleAttachmentQuery,
          { attachmentId },
          { fetchPolicy: 'network-only' },
        ).toPromise();

        const url = data?.knowledgeBaseAttachmentDownloadUrl;
        if (!url) throw new Error('No download URL returned');

        const fileResponse = await fetch(url);
        if (!fileResponse.ok) throw new Error('Failed to fetch file');
        const blob = await fileResponse.blob();
        const objectUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
      } catch (err) {
        toast({
          title: 'Download Failed',
          description: err instanceof Error ? err.message : 'Failed to download attachment',
          variant: 'destructive',
        });
      }
    },
    [environment, toast],
  );

  return { download };
}
