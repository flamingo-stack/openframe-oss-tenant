'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import { GET_TICKET_ATTACHMENT_DOWNLOAD_URL } from '../queries/ticket-queries';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';

interface DownloadUrlResponse {
  ticketAttachmentDownloadUrl: string;
}

export function useDownloadTicketAttachment() {
  const { toast } = useToast();

  const download = useCallback(
    async (attachmentId: string, fileName: string) => {
      try {
        const response = await apiClient.post<GraphQlResponse<DownloadUrlResponse>>(API_ENDPOINTS.GRAPHQL, {
          query: GET_TICKET_ATTACHMENT_DOWNLOAD_URL,
          variables: { attachmentId },
        });
        const data = extractGraphQlData(response);
        const url = data.ticketAttachmentDownloadUrl;
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
    [toast],
  );

  return { download };
}
